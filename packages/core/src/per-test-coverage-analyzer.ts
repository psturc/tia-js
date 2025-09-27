/**
 * Enhanced coverage analyzer that creates per-test coverage mapping
 * from NYC coverage data and test execution patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestFile, CoverageAnalysisResult, CoverageMap, TestCoverageData } from '@tia-js/common';
import { NYCCoverageReader } from './nyc-coverage-reader';
import { GoCoverageReader } from './go-coverage-reader';
import { PythonCoverageReader } from './python-coverage-reader';
import { createLogger, Logger } from '@tia-js/common';

export class PerTestCoverageAnalyzer {
  private nycReader: NYCCoverageReader;
  private goReader: GoCoverageReader;
  private pythonReader: PythonCoverageReader;
  private logger: Logger;
  private rootDir: string;

  constructor(rootDir: string, logger: Logger) {
    this.rootDir = rootDir;
    this.logger = logger;
    this.nycReader = new NYCCoverageReader(rootDir, logger);
    this.goReader = new GoCoverageReader(rootDir, logger);
    this.pythonReader = new PythonCoverageReader(rootDir, logger);
  }

  /**
   * Create realistic coverage mapping based on available coverage data
   * 
   * IMPORTANT: This method detects the available coverage format and uses the appropriate reader.
   * For NYC: Coverage is aggregated across all test runs.
   * For Go/Python: Uses per-test coverage files from TIA reporters.
   */
  async createPerTestMapping(): Promise<Map<string, string[]>> {
    const mapping = new Map<string, string[]>();
    
    // Check which coverage format is available (prioritize per-test coverage)
    if (this.hasPerTestCoverage()) {
      this.logger.debug('Using per-test coverage data for mapping');
      return this.createPerTestMappingFromTIA();
    } else if (this.nycReader.hasNYCCoverage()) {
      this.logger.debug('Using NYC coverage data for mapping');
      return this.createPerTestMappingFromNYC();
    } else {
      this.logger.debug('No coverage data available for per-test mapping');
      return mapping;
    }
  }

  /**
   * Check if per-test coverage data exists (Go or Python)
   */
  private hasPerTestCoverage(): boolean {
    return this.goReader.hasGoCoverage() || this.pythonReader.hasPythonCoverage();
  }

  /**
   * Create mapping from TIA per-test coverage files (Go/Python)
   */
  private async createPerTestMappingFromTIA(): Promise<Map<string, string[]>> {
    const mapping = new Map<string, string[]>();
    const perTestDir = path.join(this.rootDir, '.tia', 'per-test-coverage');
    
    if (!fs.existsSync(perTestDir)) {
      return mapping;
    }

    const coverageFiles = fs.readdirSync(perTestDir).filter(f => f.endsWith('.json'));
    
    for (const coverageFile of coverageFiles) {
      try {
        const filePath = path.join(perTestDir, coverageFile);
        const coverageData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Parse test info from filename: specName__testName.json
        const [specName, testName] = coverageFile.replace('.json', '').split('__', 2);
        const testFile = this.normalizeTestFileName(specName);
        
        // Extract covered source files
        const coveredFiles: string[] = [];
        for (const [sourceFile, coverage] of Object.entries(coverageData)) {
          if (this.isSourceFile(sourceFile) && this.hasCoverage(coverage)) {
            coveredFiles.push(this.toRelativePath(sourceFile));
          }
        }
        
        if (coveredFiles.length > 0) {
          mapping.set(testFile, coveredFiles);
          this.logger.debug(`Mapped test ${testFile} to ${coveredFiles.length} source files`);
        }
        
      } catch (error) {
        this.logger.debug(`Failed to process coverage file ${coverageFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return mapping;
  }

  /**
   * Create mapping from NYC coverage data (JavaScript/TypeScript)
   */
  private async createPerTestMappingFromNYC(): Promise<Map<string, string[]>> {
    const mapping = new Map<string, string[]>();

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
   * Normalize test file name from coverage file naming
   */
  private normalizeTestFileName(specName: string): string {
    // Convert from sanitized name back to test file path
    // e.g., "users_test" -> "tests/test_users.py" or "users_spec" -> "users.spec.js"
    
    // Handle Go test files
    if (specName.includes('_test')) {
      return specName.replace(/_/g, '/') + '.go';
    }
    
    // Handle Python test files
    if (specName.startsWith('test_') || specName.includes('_test_')) {
      return 'tests/' + specName.replace(/_/g, '_') + '.py';
    }
    
    // Handle JavaScript test files
    if (specName.includes('_spec') || specName.includes('_test')) {
      return specName.replace(/_/g, '/') + '.js';
    }
    
    // Default fallback
    return specName.replace(/_/g, '/') + '.test.js';
  }

  /**
   * Check if coverage data indicates the file was actually covered
   */
  private hasCoverage(coverage: any): boolean {
    if (!coverage || typeof coverage !== 'object') {
      return false;
    }
    
    // Check statement hits
    const statements = Object.values(coverage.s || {});
    if (statements.some((hits: any) => hits > 0)) {
      return true;
    }
    
    // Check function hits
    const functions = Object.values(coverage.f || {});
    if (functions.some((hits: any) => hits > 0)) {
      return true;
    }
    
    return false;
  }

  /**
   * Convert absolute path to relative path
   */
  private toRelativePath(absolutePath: string): string {
    if (absolutePath.startsWith(this.rootDir)) {
      return path.relative(this.rootDir, absolutePath);
    }
    return absolutePath;
  }

  /**
   * Check if a file path represents a source file we should analyze
   */
  private isSourceFile(filePath: string): boolean {
    // Handle different file types
    const isJavaScript = filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx');
    const isGo = filePath.endsWith('.go') && !filePath.endsWith('_test.go');
    const isPython = filePath.endsWith('.py') && !filePath.includes('test_') && !filePath.includes('_test.py') && !filePath.includes('conftest.py');
    
    // Common exclusions
    const isExcluded = filePath.includes('node_modules') ||
                      filePath.includes('__pycache__') ||
                      filePath.includes('/vendor/') ||
                      filePath.includes('/.git/');
    
    if (isExcluded) {
      return false;
    }
    
    // JavaScript/TypeScript source files
    if (isJavaScript) {
      return filePath.includes('/src/') &&
             !filePath.includes('/test/') &&
             !filePath.includes('.test.') &&
             !filePath.includes('.spec.');
    }
    
    // Go source files
    if (isGo) {
      return true;
    }
    
    // Python source files
    if (isPython) {
      return !filePath.includes('/tests/') &&
             !filePath.startsWith('test_');
    }
    
    return false;
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
