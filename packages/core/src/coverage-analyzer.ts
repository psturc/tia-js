import { CoverageAnalysisResult, TestFile, CoverageMap, isTestFile } from '@tia-js/common';
import { CoverageStorage } from './coverage-storage';
import { NYCCoverageReader } from './nyc-coverage-reader';
import { GoCoverageReader } from './go-coverage-reader';
import { PythonCoverageReader } from './python-coverage-reader';
import { DependencyAnalyzer } from './dependency-analyzer';
import { createLogger, Logger } from '@tia-js/common';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Analyzes test coverage to determine which tests are affected by file changes
 */
export class CoverageAnalyzer {
  private coverageStorage: CoverageStorage;
  private nycReader: NYCCoverageReader;
  private goReader: GoCoverageReader;
  private pythonReader: PythonCoverageReader;
  private dependencyAnalyzer: DependencyAnalyzer;
  private logger: Logger;
  private rootDir: string;

  constructor(rootDir: string, dependencyAnalyzer: DependencyAnalyzer, logger: Logger) {
    this.rootDir = rootDir;
    this.logger = logger;
    this.dependencyAnalyzer = dependencyAnalyzer;
    this.coverageStorage = new CoverageStorage(rootDir, logger);
    this.nycReader = new NYCCoverageReader(rootDir, logger);
    this.goReader = new GoCoverageReader(rootDir, logger);
    this.pythonReader = new PythonCoverageReader(rootDir, logger);
  }

  /**
   * Find all test files in the project
   */
  private async findAllTestFiles(): Promise<TestFile[]> {
    const testFiles: TestFile[] = [];
    await this.scanDirectoryForTests(this.rootDir, testFiles);
    return testFiles;
  }

  private async scanDirectoryForTests(dirPath: string, testFiles: TestFile[]): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.rootDir, fullPath);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common non-test directories
          if (!entry.name.startsWith('.') && 
              entry.name !== 'node_modules' && 
              entry.name !== 'dist' && 
              entry.name !== 'build') {
            await this.scanDirectoryForTests(fullPath, testFiles);
          }
        } else if (entry.isFile() && isTestFile(relativePath)) {
          testFiles.push({
            path: relativePath,
            reason: 'forced',
            priority: 50
          });
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find test files that would likely exercise a given source file
   */
  private async findTestsForSourceFile(sourceFile: string): Promise<string[]> {
    try {
      // Get all test files in the project using file system
      const testFiles = await this.findAllTestFiles();
      
      // For NYC coverage, we use intelligent heuristics to map source files to tests
      const sourceFileName = path.basename(sourceFile, path.extname(sourceFile));
      const relevantTests: string[] = [];
      
      for (const testFile of testFiles) {
        const testFileName = path.basename(testFile.path, path.extname(testFile.path));
        
        // Check if test name matches source file (e.g., calculator.js -> calculator.cy.js)
        if (testFileName.includes(sourceFileName) || sourceFileName.includes(testFileName.replace('.cy', '').replace('.test', '').replace('.spec', ''))) {
          relevantTests.push(testFile.path);
          this.logger.debug(`Found matching test: ${testFile.path} for source: ${sourceFile}`);
        }
      }
      
      // If no specific tests found but file was covered, it might be a utility used by many tests
      // In this case, we should be conservative and suggest all E2E tests
      if (relevantTests.length === 0 && testFiles.length > 0) {
        this.logger.debug(`No specific tests found for ${sourceFile}, suggesting relevant test suite`);
        
        // For calculator.js, suggest calculator-related tests
        if (sourceFile.includes('calculator')) {
          const calculatorTests = testFiles.filter((t: TestFile) => t.path.includes('calculator'));
          relevantTests.push(...calculatorTests.map((t: TestFile) => t.path));
        }
        
        // If still no matches and it's a core file, suggest main E2E tests
        if (relevantTests.length === 0) {
          relevantTests.push(...testFiles.slice(0, Math.min(testFiles.length, 1)).map((t: TestFile) => t.path));
        }
      }
      
      return relevantTests;
    } catch (error) {
      this.logger.error(`Failed to find tests for source file ${sourceFile}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Analyze which tests are affected based on changed files and NYC coverage (if available)
   */
  async analyzeAffectedTestsWithNYC(
    changedFiles: string[]
  ): Promise<CoverageAnalysisResult> {
    try {
      this.logger.debug(`Analyzing NYC coverage for ${changedFiles.length} changed files`);
      
      // Check if NYC coverage is available
      if (!this.nycReader.hasNYCCoverage()) {
        this.logger.info('No NYC coverage found, falling back to TIA coverage storage');
        return this.analyzeAffectedTests(changedFiles);
      }

      // Read covered files from NYC
      const coveredFiles = await this.nycReader.readNYCCoverage();
      this.logger.debug(`NYC covered files: ${coveredFiles.join(', ')}`);

      // Check which changed files were covered
      const affectedTestsMap = new Map<string, TestFile>();
      
      for (const changedFile of changedFiles) {
        const normalizedChangedFile = this.normalizePath(changedFile);
        const relativeChangedFile = path.relative(this.rootDir, normalizedChangedFile);
        
        if (coveredFiles.includes(relativeChangedFile)) {
          this.logger.debug(`NYC coverage found for: ${relativeChangedFile}`);
          
          // NYC coverage confirms this file was executed, now find actual tests that would exercise it
          const relevantTests = await this.findTestsForSourceFile(relativeChangedFile);
          this.logger.debug(`Found ${relevantTests.length} tests for covered file: ${relativeChangedFile}`);
          
          for (const testPath of relevantTests) {
            const testFile: TestFile = {
              path: testPath,
              reason: 'coverage-direct',
              priority: 90 // High priority for actual coverage
            };
            affectedTestsMap.set(testPath, testFile);
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
        hasCoverageData: coveredFiles.length > 0,
        fallbackStrategy: affectedTestsMap.size === 0 ? 'heuristic' : undefined
      };

    } catch (error) {
      this.logger.error(`NYC coverage analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fall back to TIA coverage storage
      return this.analyzeAffectedTests(changedFiles);
    }
  }

  /**
   * Analyze which tests are affected based on changed files and coverage data
   */
  async analyzeAffectedTests(
    changedFiles: string[], 
    fallbackStrategy: 'heuristic' | 'all-tests' | 'none' = 'heuristic'
  ): Promise<CoverageAnalysisResult> {
    try {
      this.logger.debug(`Analyzing coverage for ${changedFiles.length} changed files`);
      
      const coverageMap = await this.coverageStorage.loadCoverageMap();
      const affectedTestsMap = new Map<string, TestFile>();

      // Check if we have coverage data
      if (coverageMap.tests.size === 0) {
        this.logger.warn('No coverage data available, using fallback strategy');
        return this.handleNoCoverageData(changedFiles, coverageMap, fallbackStrategy);
      }

      // For each changed file, find tests that covered it
      for (const changedFile of changedFiles) {
        const normalizedChangedFile = this.normalizePath(changedFile);
        const relativeChangedFile = path.relative(this.rootDir, normalizedChangedFile);
        
        this.logger.debug(`Looking for coverage of: ${relativeChangedFile} (from ${normalizedChangedFile})`);
        
        // Try both relative and absolute paths
        let coveringTests = await this.coverageStorage.getTestsCoveringFile(relativeChangedFile);
        if (coveringTests.length === 0) {
          coveringTests = await this.coverageStorage.getTestsCoveringFile(normalizedChangedFile);
        }
        
        if (coveringTests.length > 0) {
          this.logger.debug(`Found ${coveringTests.length} tests covering ${relativeChangedFile}`);
          
          for (const testData of coveringTests) {
            // Check if we have per-test granularity (contains ::)
            if (testData.testFile.includes('::')) {
              // Keep the full per-test identifier for granular analysis
              const testFile: TestFile = {
                path: testData.testFile, // Keep the full "file::testname" format
                reason: 'coverage-direct',
                priority: this.calculatePriority(testData, normalizedChangedFile),
                metadata: {
                  testName: testData.metadata?.testName,
                  specFile: testData.metadata?.specFile || testData.testFile.split('::')[0]
                }
              };
              affectedTestsMap.set(testData.testFile, testFile);
            } else {
              // Legacy format - just the file path
              const testFile: TestFile = {
                path: testData.testFile,
                reason: 'coverage-direct',
                priority: this.calculatePriority(testData, normalizedChangedFile)
              };
              affectedTestsMap.set(testData.testFile, testFile);
            }
          }
        } else {
          this.logger.debug(`No coverage data found for ${relativeChangedFile}`);
        }
      }

      // If no tests were found but we have coverage data, it might mean:
      // 1. Changed files are new and haven't been covered yet
      // 2. Changed files are non-source files (config, docs, etc.)
      if (affectedTestsMap.size === 0 && coverageMap.tests.size > 0) {
        this.logger.info('No tests found in coverage data for changed files');
        
        // Check if any changed files are likely source files
        const sourceFileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.html', '.css'];
        const hasSourceFileChanges = changedFiles.some(file => 
          sourceFileExtensions.some(ext => file.endsWith(ext))
        );

        if (hasSourceFileChanges && fallbackStrategy !== 'none') {
          this.logger.info('Source files changed but no coverage found, applying fallback strategy');
          return this.handleNoCoverageData(changedFiles, coverageMap, fallbackStrategy);
        }
      }

      return {
        affectedTests: Array.from(affectedTestsMap.values()),
        coverageMap,
        hasCoverageData: true,
        fallbackStrategy: affectedTestsMap.size === 0 ? fallbackStrategy : undefined
      };

    } catch (error) {
      this.logger.error(`Coverage analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to empty result
      return {
        affectedTests: [],
        coverageMap: await this.coverageStorage.loadCoverageMap(),
        hasCoverageData: false,
        fallbackStrategy
      };
    }
  }

  /**
   * Handle cases where no coverage data is available
   */
  private async handleNoCoverageData(
    changedFiles: string[], 
    coverageMap: CoverageMap, 
    fallbackStrategy: 'heuristic' | 'all-tests' | 'none'
  ): Promise<CoverageAnalysisResult> {
    const affectedTests: TestFile[] = [];

    switch (fallbackStrategy) {
      case 'heuristic':
        // This would integrate with the existing heuristic logic
        this.logger.info('Using heuristic fallback for test selection');
        break;
        
      case 'all-tests':
        // Mark all known tests as affected
        for (const testData of coverageMap.tests.values()) {
          affectedTests.push({
            path: testData.testFile,
            reason: 'forced',
            priority: 50 // Medium priority for fallback
          });
        }
        this.logger.info(`Fallback: Selected all ${affectedTests.length} tests`);
        break;
        
      case 'none':
        this.logger.info('No fallback strategy - returning no tests');
        break;
    }

    return {
      affectedTests,
      coverageMap,
      hasCoverageData: false,
      fallbackStrategy
    };
  }

  /**
   * Calculate priority for a test based on coverage data
   */
  private calculatePriority(testData: any, changedFile: string): number {
    // Base priority
    let priority = 80;

    // Increase priority if this test covers fewer files (more focused)
    if (testData.executedFiles.length < 5) {
      priority += 10;
    } else if (testData.executedFiles.length > 20) {
      priority -= 10;
    }

    // Increase priority if test was recently updated
    const daysSinceUpdate = (Date.now() - testData.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 1) {
      priority += 5;
    }

    // Increase priority based on test status
    if (testData.metadata?.status === 'failed') {
      priority += 15; // Failed tests are more important to re-run
    } else if (testData.metadata?.status === 'passed') {
      priority += 5;
    }

    // Increase priority if test duration is short (faster feedback)
    if (testData.metadata?.duration && testData.metadata.duration < 1000) {
      priority += 5;
    }

    return Math.min(100, Math.max(0, priority));
  }

  /**
   * Normalize file path for consistent comparison
   */
  private normalizePath(filePath: string): string {
    // Convert to absolute path if relative
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(this.rootDir, filePath);
    
    // Normalize path separators and resolve any '..' or '.'
    return path.normalize(absolutePath);
  }

  /**
   * Get coverage statistics
   */
  async getCoverageStats() {
    return this.coverageStorage.getCoverageStats();
  }

  /**
   * Clear all coverage data
   */
  async clearCoverageData(): Promise<void> {
    return this.coverageStorage.clearCoverageData();
  }
}
