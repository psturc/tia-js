/**
 * Enhanced coverage analyzer that creates per-test coverage mapping
 * from NYC coverage data and test execution patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestFile, CoverageAnalysisResult, CoverageMap, TestCoverageData } from '@tia-js/common';
import { NYCCoverageReader } from './nyc-coverage-reader';
import { createLogger, Logger } from '@tia-js/common';

export class PerTestCoverageAnalyzer {
  private nycReader: NYCCoverageReader;
  private logger: Logger;
  private rootDir: string;

  constructor(rootDir: string, logger: Logger) {
    this.rootDir = rootDir;
    this.logger = logger;
    this.nycReader = new NYCCoverageReader(rootDir, logger);
  }

  /**
   * Create realistic coverage mapping based on NYC data
   * 
   * IMPORTANT: NYC coverage is aggregated across all test runs.
   * We can only show which files WERE covered, not which specific test covered them.
   * This mapping shows potential relationships based on coverage presence.
   */
  async createPerTestMapping(): Promise<Map<string, string[]>> {
    const mapping = new Map<string, string[]>();
    
    if (!this.nycReader.hasNYCCoverage()) {
      this.logger.debug('No NYC coverage available for per-test mapping');
      return mapping;
    }

    try {
      // Read the raw NYC coverage data
      const nycPath = path.join(this.rootDir, '.nyc_output', 'out.json');
      const rawCoverage = JSON.parse(await fs.promises.readFile(nycPath, 'utf-8'));
      
      this.logger.debug('Creating coverage-aware mapping from NYC data...');
      this.logger.warn('Note: NYC coverage is aggregated - mapping shows potential relationships, not definitive per-test isolation');
      
      // Get all covered files (files with any coverage > 0)
      const coveredFiles: string[] = [];
      
      for (const [filePath, coverage] of Object.entries(rawCoverage)) {
        if (this.isSourceFile(filePath)) {
          const relativePath = path.relative(this.rootDir, filePath);
          const intensity = this.calculateCoverageIntensity(coverage as any);
          
          if (intensity.executedStatements > 0) {
            coveredFiles.push(relativePath);
            this.logger.debug(`File ${relativePath}: ${intensity.executedStatements}/${intensity.totalStatements} statements covered`);
          }
        }
      }

      // Discover all test files
      const allTestFiles = await this.discoverTestFiles();
      
      if (allTestFiles.length === 0) {
        this.logger.warn('No test files discovered');
        return mapping;
      }

      this.logger.debug(`Found ${allTestFiles.length} test files: ${allTestFiles.join(', ')}`);
      this.logger.debug(`Found ${coveredFiles.length} covered source files: ${coveredFiles.join(', ')}`);

      // Create honest mapping based ONLY on clear naming relationships
      for (const sourceFile of coveredFiles) {
        const potentialTests = this.findPotentialTestsForFile(sourceFile, allTestFiles);
        
        if (potentialTests.length > 0) {
          // Only map files that have clear naming relationships
          for (const testFile of potentialTests) {
            if (!mapping.has(testFile)) {
              mapping.set(testFile, []);
            }
            mapping.get(testFile)!.push(sourceFile);
            this.logger.debug(`Mapped ${sourceFile} → ${testFile} (clear naming relationship)`);
          }
        } else {
          // For files with no clear test relationship, don't make assumptions
          // This is more honest about what we can actually determine
          this.logger.debug(`File ${sourceFile} has no clear test relationship - skipping mapping`);
        }
      }

      this.logger.debug(`Created coverage-aware mapping for ${mapping.size} tests`);
      return mapping;
      
    } catch (error) {
      this.logger.error(`Failed to create per-test mapping: ${error instanceof Error ? error.message : String(error)}`);
      return mapping;
    }
  }

  /**
   * Analyze which tests would likely exercise a file based on its usage patterns
   * Uses universal heuristics that work for any project
   */
  private async analyzeFileUsagePattern(filePath: string, coverage: any): Promise<string[]> {
    const tests: string[] = [];
    const intensity = this.calculateCoverageIntensity(coverage);
    
    this.logger.debug(`File ${filePath} has ${intensity.executedStatements}/${intensity.totalStatements} statements executed`);

    // Only proceed if the file has actual coverage
    if (intensity.executedStatements === 0) {
      return tests;
    }

    // Discover all test files dynamically
    const allTestFiles = await this.discoverTestFiles();
    
    if (allTestFiles.length === 0) {
      this.logger.warn('No test files discovered for mapping');
      return tests;
    }

    // Use universal heuristics based on file purpose and coverage intensity
    if (intensity.percentage > 80) {
      // High coverage suggests this file is actively used
      // Map to tests with similar naming or all tests if uncertain
      const relatedTests = this.findRelatedTests(filePath, allTestFiles);
      if (relatedTests.length > 0) {
        tests.push(...relatedTests);
      } else {
        // If no related tests found, file might be shared infrastructure
        tests.push(...allTestFiles);
      }
    } else if (intensity.percentage > 30) {
      // Moderate coverage suggests shared functionality
      const relatedTests = this.findRelatedTests(filePath, allTestFiles);
      if (relatedTests.length > 0) {
        tests.push(...relatedTests);
      } else {
        // Conservative: assume it affects multiple tests
        tests.push(...allTestFiles.slice(0, Math.min(allTestFiles.length, 2)));
      }
    } else if (intensity.percentage > 10) {
      // Low coverage suggests specific functionality
      const relatedTests = this.findRelatedTests(filePath, allTestFiles);
      if (relatedTests.length > 0) {
        tests.push(...relatedTests.slice(0, 1)); // Just the most related test
      }
    }

    return tests;
  }

  /**
   * Discover all test files in the project dynamically
   */
  private async discoverTestFiles(): Promise<string[]> {
    const testFiles: string[] = [];
    await this.scanForTestFiles(this.rootDir, testFiles);
    return testFiles;
  }

  /**
   * Recursively scan for test files
   */
  private async scanForTestFiles(dirPath: string, testFiles: string[]): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.rootDir, fullPath);
        
        if (entry.isDirectory()) {
          // Skip common non-test directories
          if (!entry.name.startsWith('.') && 
              entry.name !== 'node_modules' && 
              entry.name !== 'dist' && 
              entry.name !== 'build' &&
              entry.name !== 'coverage') {
            await this.scanForTestFiles(fullPath, testFiles);
          }
        } else if (entry.isFile() && this.isTestFile(relativePath)) {
          testFiles.push(relativePath);
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a file is a test file using universal patterns
   */
  private isTestFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    
    // Universal test file patterns
    return (
      fileName.endsWith('.test.js') ||
      fileName.endsWith('.test.ts') ||
      fileName.endsWith('.spec.js') ||
      fileName.endsWith('.spec.ts') ||
      fileName.endsWith('.cy.js') ||
      fileName.endsWith('.cy.ts') ||
      fileName.endsWith('.e2e.js') ||
      fileName.endsWith('.e2e.ts') ||
      (filePath.includes('/test/') && (fileName.endsWith('.js') || fileName.endsWith('.ts'))) ||
      (filePath.includes('/tests/') && (fileName.endsWith('.js') || fileName.endsWith('.ts'))) ||
      (filePath.includes('/spec/') && (fileName.endsWith('.js') || fileName.endsWith('.ts'))) ||
      (filePath.includes('/cypress/') && fileName.endsWith('.js')) ||
      (filePath.includes('/__tests__/') && (fileName.endsWith('.js') || fileName.endsWith('.ts')))
    );
  }

  /**
   * Find potential tests that might exercise a source file based on naming patterns
   * This is conservative and based only on file naming conventions
   */
  private findPotentialTestsForFile(sourceFile: string, allTestFiles: string[]): string[] {
    const sourceBaseName = path.basename(sourceFile, path.extname(sourceFile));
    const potentialTests: string[] = [];

    for (const testFile of allTestFiles) {
      const testBaseName = path.basename(testFile, path.extname(testFile))
        .replace(/\.(test|spec|cy|e2e)$/, ''); // Remove test suffixes
      
      // Check for name similarity
      if (testBaseName.includes(sourceBaseName) || 
          sourceBaseName.includes(testBaseName) ||
          sourceFile.includes(testBaseName) ||
          testFile.includes(sourceBaseName)) {
        potentialTests.push(testFile);
        this.logger.debug(`Found potential relationship: ${sourceFile} <-> ${testFile}`);
      }
    }

    return potentialTests;
  }

  /**
   * Find tests that are related to a source file based on naming patterns
   * (Legacy method for compatibility)
   */
  private findRelatedTests(sourceFile: string, allTestFiles: string[]): string[] {
    return this.findPotentialTestsForFile(sourceFile, allTestFiles);
  }

  /**
   * Calculate coverage intensity metrics
   */
  private calculateCoverageIntensity(coverage: any): {
    totalStatements: number;
    executedStatements: number;
    percentage: number;
    totalFunctions: number;
    executedFunctions: number;
  } {
    let totalStatements = 0;
    let executedStatements = 0;
    let totalFunctions = 0;
    let executedFunctions = 0;

    // Count executed statements
    for (const [id, count] of Object.entries(coverage.s || {})) {
      totalStatements++;
      if ((count as number) > 0) {
        executedStatements++;
      }
    }

    // Count executed functions
    for (const [id, count] of Object.entries(coverage.f || {})) {
      totalFunctions++;
      if ((count as number) > 0) {
        executedFunctions++;
      }
    }

    return {
      totalStatements,
      executedStatements,
      percentage: totalStatements > 0 ? (executedStatements / totalStatements) * 100 : 0,
      totalFunctions,
      executedFunctions
    };
  }


  /**
   * Check if a file path represents a source file we should analyze
   */
  private isSourceFile(filePath: string): boolean {
    return filePath.includes('/src/') && 
           filePath.endsWith('.js') &&
           !filePath.includes('node_modules') &&
           !filePath.includes('/test/') &&
           !filePath.includes('.test.') &&
           !filePath.includes('.spec.');
  }

  /**
   * Analyze which tests are affected by changed files using intelligent per-test mapping
   */
  async analyzeWithPerTestMapping(changedFiles: string[]): Promise<CoverageAnalysisResult> {
    try {
      const perTestMapping = await this.createPerTestMapping();
      const affectedTestsMap = new Map<string, TestFile>();

      this.logger.debug(`Analyzing ${changedFiles.length} changed files with per-test mapping`);

      for (const changedFile of changedFiles) {
        const normalizedPath = path.relative(this.rootDir, changedFile);
        
        // Find tests that cover this file
        for (const [testFile, coveredFiles] of perTestMapping) {
          if (coveredFiles.includes(normalizedPath)) {
            const testInfo: TestFile = {
              path: testFile,
              reason: 'coverage-direct',
              priority: 95 // High priority for precise coverage mapping
            };
            affectedTestsMap.set(testFile, testInfo);
            this.logger.debug(`File ${normalizedPath} affects test ${testFile}`);
          }
        }
      }

      const emptyCoverageMap: CoverageMap = {
        tests: new Map(),
        lastUpdated: Date.now(),
        rootDir: this.rootDir
      };

      return {
        affectedTests: Array.from(affectedTestsMap.values()),
        coverageMap: emptyCoverageMap,
        hasCoverageData: perTestMapping.size > 0,
        fallbackStrategy: affectedTestsMap.size === 0 ? 'heuristic' : undefined
      };

    } catch (error) {
      this.logger.error(`Per-test coverage analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to simpler analysis
      return {
        affectedTests: [],
        coverageMap: { tests: new Map(), lastUpdated: Date.now(), rootDir: this.rootDir },
        hasCoverageData: false,
        fallbackStrategy: 'heuristic'
      };
    }
  }

  /**
   * Get the per-test coverage mapping for display
   */
  async getPerTestCoverageMapping(): Promise<Map<string, string[]>> {
    return this.createPerTestMapping();
  }
}
