import { CoverageAnalysisResult, TestFile, CoverageMap } from '@tia-js/common';
import { CoverageStorage } from './coverage-storage';
import { NYCCoverageReader } from './nyc-coverage-reader';
import { createLogger, Logger } from '@tia-js/common';
import * as path from 'path';

/**
 * Analyzes test coverage to determine which tests are affected by file changes
 */
export class CoverageAnalyzer {
  private coverageStorage: CoverageStorage;
  private nycReader: NYCCoverageReader;
  private logger: Logger;
  private rootDir: string;

  constructor(rootDir: string, logger: Logger) {
    this.rootDir = rootDir;
    this.logger = logger;
    this.coverageStorage = new CoverageStorage(rootDir, logger);
    this.nycReader = new NYCCoverageReader(rootDir, logger);
  }

  /**
   * Analyze which tests are affected based on changed files and NYC coverage (if available)
   */
  async analyzeAffectedTestsWithNYC(
    changedFiles: string[],
    currentTestFile: string = 'current-test'
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
          
          // For NYC coverage, we know this test covered the file
          const testFile: TestFile = {
            path: currentTestFile,
            reason: 'coverage-direct',
            priority: 90 // High priority for actual coverage
          };
          affectedTestsMap.set(currentTestFile, testFile);
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
            const testFile: TestFile = {
              path: testData.testFile,
              reason: 'coverage-direct',
              priority: this.calculatePriority(testData, normalizedChangedFile)
            };
            affectedTestsMap.set(testData.testFile, testFile);
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
