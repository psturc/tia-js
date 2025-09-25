/**
 * Per-test coverage collector - runs tests individually to build precise coverage mapping
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createLogger, Logger, TestCoverageData } from '@tia-js/common';
import { CoverageStorage } from './coverage-storage';

export interface PerTestRunnerConfig {
  rootDir: string;
  testCommand: string;  // e.g., "npx cypress run --spec"
  testPattern: string;  // e.g., "cypress/e2e/**/*.cy.js"
  coverageOutputPath: string;  // e.g., ".nyc_output/out.json"
  cleanupBetweenTests: boolean;
}

export class PerTestRunner {
  private config: PerTestRunnerConfig;
  private logger: Logger;
  private coverageStorage: CoverageStorage;

  constructor(config: PerTestRunnerConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || createLogger('info');
    this.coverageStorage = new CoverageStorage(config.rootDir, this.logger);
  }

  /**
   * Run all tests individually and collect per-test coverage
   */
  async collectPerTestCoverage(): Promise<Map<string, TestCoverageData>> {
    this.logger.info('🧪 Starting per-test coverage collection...');
    
    // Discover all test files
    const testFiles = await this.discoverTestFiles();
    this.logger.info(`Found ${testFiles.length} test files to run individually`);

    const perTestData = new Map<string, TestCoverageData>();

    for (const testFile of testFiles) {
      this.logger.info(`🔄 Running test: ${testFile}`);
      
      try {
        // Clear previous coverage data
        if (this.config.cleanupBetweenTests) {
          await this.clearCoverageData();
        }

        // Run individual test with coverage
        const testResult = await this.runSingleTest(testFile);
        
        if (testResult.success) {
          // Read coverage data immediately after test
          const coverageData = await this.extractCoverageForTest(testFile, testResult);
          
          if (coverageData) {
            perTestData.set(testFile, coverageData);
            
            // Store in TIA coverage storage
            await this.coverageStorage.storeCoverageData(coverageData);
            
            this.logger.info(`✅ Collected coverage for ${testFile}: ${coverageData.executedFiles.length} files`);
          } else {
            this.logger.warn(`⚠️  No coverage data collected for ${testFile}`);
          }
        } else {
          this.logger.error(`❌ Test failed: ${testFile} - ${testResult.error}`);
        }
        
      } catch (error) {
        this.logger.error(`❌ Error running ${testFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.logger.info(`🎉 Per-test coverage collection complete! Collected data for ${perTestData.size}/${testFiles.length} tests`);
    return perTestData;
  }

  /**
   * Run a single test and return execution result
   */
  private async runSingleTest(testFile: string): Promise<{
    success: boolean;
    duration: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const command = `${this.config.testCommand} "${testFile}"`;
      this.logger.debug(`Executing: ${command}`);
      
      execSync(command, {
        cwd: this.config.rootDir,
        stdio: 'pipe', // Capture output
        timeout: 120000 // 2 minute timeout per test
      });
      
      return {
        success: true,
        duration: Date.now() - startTime
      };
      
    } catch (error: any) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Extract coverage data for a specific test
   */
  private async extractCoverageForTest(testFile: string, testResult: any): Promise<TestCoverageData | null> {
    try {
      const coverageFilePath = path.join(this.config.rootDir, this.config.coverageOutputPath);
      
      if (!fs.existsSync(coverageFilePath)) {
        this.logger.debug(`No coverage file found at ${coverageFilePath}`);
        return null;
      }

      // Read the NYC coverage data
      const coverageContent = await fs.promises.readFile(coverageFilePath, 'utf-8');
      const nycCoverage = JSON.parse(coverageContent);

      // Extract covered source files
      const executedFiles: string[] = [];
      
      for (const [filePath, coverage] of Object.entries(nycCoverage)) {
        if (this.isSourceFile(filePath) && this.hasExecutedStatements(coverage as any)) {
          const relativePath = path.relative(this.config.rootDir, filePath);
          executedFiles.push(relativePath);
        }
      }

      return {
        testFile,
        executedFiles,
        timestamp: Date.now(),
        framework: this.detectFramework(testFile),
        metadata: {
          duration: testResult.duration,
          status: testResult.success ? 'passed' : 'failed'
        }
      };

    } catch (error) {
      this.logger.error(`Failed to extract coverage for ${testFile}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Discover all test files matching the pattern
   */
  private async discoverTestFiles(): Promise<string[]> {
    const testFiles: string[] = [];
    await this.scanForTestFiles(this.config.rootDir, testFiles);
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
        const relativePath = path.relative(this.config.rootDir, fullPath);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && 
              entry.name !== 'node_modules' && 
              entry.name !== 'dist' && 
              entry.name !== 'build' &&
              entry.name !== 'coverage') {
            await this.scanForTestFiles(fullPath, testFiles);
          }
        } else if (entry.isFile() && this.matchesTestPattern(relativePath)) {
          testFiles.push(relativePath);
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if file matches test pattern
   */
  private matchesTestPattern(filePath: string): boolean {
    // Simple pattern matching - can be enhanced with glob patterns
    return (
      filePath.endsWith('.cy.js') ||
      filePath.endsWith('.test.js') ||
      filePath.endsWith('.spec.js') ||
      filePath.endsWith('.e2e.js') ||
      (filePath.includes('/test/') && filePath.endsWith('.js')) ||
      (filePath.includes('/spec/') && filePath.endsWith('.js'))
    );
  }

  /**
   * Check if a file is a source file we should track
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
   * Check if coverage data shows executed statements
   */
  private hasExecutedStatements(coverage: any): boolean {
    for (const statementId in coverage.s || {}) {
      if (coverage.s[statementId] > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect test framework from file path
   */
  private detectFramework(testFile: string): string {
    if (testFile.includes('cypress')) return 'cypress';
    if (testFile.includes('playwright')) return 'playwright';
    if (testFile.includes('jest') || testFile.includes('.test.')) return 'jest';
    return 'unknown';
  }

  /**
   * Clear coverage data between tests
   */
  private async clearCoverageData(): Promise<void> {
    try {
      const coverageFilePath = path.join(this.config.rootDir, this.config.coverageOutputPath);
      const coverageDir = path.dirname(coverageFilePath);
      
      if (fs.existsSync(coverageDir)) {
        await fs.promises.rm(coverageDir, { recursive: true, force: true });
        this.logger.debug('Cleared coverage data directory');
      }
    } catch (error) {
      this.logger.debug(`Failed to clear coverage data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the collected per-test coverage data
   */
  async getPerTestCoverageData(): Promise<Map<string, TestCoverageData>> {
    const coverageMap = await this.coverageStorage.loadCoverageMap();
    return coverageMap.tests;
  }
}
