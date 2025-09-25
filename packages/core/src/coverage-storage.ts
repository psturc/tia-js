import * as fs from 'fs';
import * as path from 'path';
import { CoverageMap, TestCoverageData } from '@tia-js/common';
import { createLogger, Logger } from '@tia-js/common';

/**
 * Manages storage and retrieval of test coverage data
 */
export class CoverageStorage {
  private logger: Logger;
  private storageDir: string;
  private coverageFilePath: string;

  constructor(rootDir: string, logger: Logger) {
    this.logger = logger;
    this.storageDir = path.join(rootDir, '.tia');
    this.coverageFilePath = path.join(this.storageDir, 'coverage.json');
    this.ensureStorageDir();
  }

  /**
   * Store coverage data for a test
   */
  async storeCoverageData(coverageData: TestCoverageData): Promise<void> {
    try {
      const coverageMap = await this.loadCoverageMap();
      
      // Update the coverage data for this test
      coverageMap.tests.set(coverageData.testFile, coverageData);
      coverageMap.lastUpdated = Date.now();

      await this.saveCoverageMap(coverageMap);
      
      this.logger.debug(`Stored coverage data for test: ${coverageData.testFile}`);
    } catch (error) {
      this.logger.error(`Failed to store coverage data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Store coverage data for multiple tests
   */
  async storeBulkCoverageData(coverageDataList: TestCoverageData[]): Promise<void> {
    try {
      const coverageMap = await this.loadCoverageMap();
      
      // Update coverage data for all tests
      for (const coverageData of coverageDataList) {
        coverageMap.tests.set(coverageData.testFile, coverageData);
      }
      coverageMap.lastUpdated = Date.now();

      await this.saveCoverageMap(coverageMap);
      
      this.logger.debug(`Stored coverage data for ${coverageDataList.length} tests`);
    } catch (error) {
      this.logger.error(`Failed to store bulk coverage data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Load the complete coverage map
   */
  async loadCoverageMap(): Promise<CoverageMap> {
    try {
      if (!fs.existsSync(this.coverageFilePath)) {
        // Return empty coverage map if file doesn't exist
        return {
          tests: new Map(),
          lastUpdated: Date.now(),
          rootDir: path.dirname(this.storageDir)
        };
      }

      const data = await fs.promises.readFile(this.coverageFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert the tests object back to a Map
      const coverageMap: CoverageMap = {
        tests: new Map(),
        lastUpdated: parsed.lastUpdated || Date.now(),
        rootDir: parsed.rootDir || path.dirname(this.storageDir)
      };

      if (parsed.tests) {
        for (const [testFile, testData] of Object.entries(parsed.tests)) {
          coverageMap.tests.set(testFile, testData as TestCoverageData);
        }
      }

      return coverageMap;
    } catch (error) {
      this.logger.warn(`Failed to load coverage map, returning empty map: ${error instanceof Error ? error.message : String(error)}`);
      return {
        tests: new Map(),
        lastUpdated: Date.now(),
        rootDir: path.dirname(this.storageDir)
      };
    }
  }

  /**
   * Get coverage data for a specific test
   */
  async getCoverageData(testFile: string): Promise<TestCoverageData | null> {
    try {
      const coverageMap = await this.loadCoverageMap();
      return coverageMap.tests.get(testFile) || null;
    } catch (error) {
      this.logger.error(`Failed to get coverage data for ${testFile}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Find tests that covered a specific source file
   */
  async getTestsCoveringFile(sourceFile: string): Promise<TestCoverageData[]> {
    try {
      const coverageMap = await this.loadCoverageMap();
      const coveringTests: TestCoverageData[] = [];

      for (const testData of coverageMap.tests.values()) {
        if (testData.executedFiles.includes(sourceFile)) {
          coveringTests.push(testData);
        }
      }

      return coveringTests;
    } catch (error) {
      this.logger.error(`Failed to find tests covering ${sourceFile}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Clear all coverage data
   */
  async clearCoverageData(): Promise<void> {
    try {
      if (fs.existsSync(this.coverageFilePath)) {
        await fs.promises.unlink(this.coverageFilePath);
        this.logger.info('Cleared all coverage data');
      }
    } catch (error) {
      this.logger.error(`Failed to clear coverage data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get coverage statistics
   */
  async getCoverageStats(): Promise<{
    totalTests: number;
    totalSourceFiles: number;
    averageFilesPerTest: number;
    lastUpdated: number;
  }> {
    try {
      const coverageMap = await this.loadCoverageMap();
      const allSourceFiles = new Set<string>();
      
      for (const testData of coverageMap.tests.values()) {
        testData.executedFiles.forEach(file => allSourceFiles.add(file));
      }

      const totalTests = coverageMap.tests.size;
      const totalSourceFiles = allSourceFiles.size;
      const averageFilesPerTest = totalTests > 0 
        ? Array.from(coverageMap.tests.values()).reduce((sum, test) => sum + test.executedFiles.length, 0) / totalTests
        : 0;

      return {
        totalTests,
        totalSourceFiles,
        averageFilesPerTest,
        lastUpdated: coverageMap.lastUpdated
      };
    } catch (error) {
      this.logger.error(`Failed to get coverage stats: ${error instanceof Error ? error.message : String(error)}`);
      return {
        totalTests: 0,
        totalSourceFiles: 0,
        averageFilesPerTest: 0,
        lastUpdated: 0
      };
    }
  }

  /**
   * Ensure the storage directory exists
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      this.logger.debug(`Created TIA storage directory: ${this.storageDir}`);
    }
  }

  /**
   * Save the coverage map to disk
   */
  private async saveCoverageMap(coverageMap: CoverageMap): Promise<void> {
    // Convert Map to object for JSON serialization
    const serializable = {
      tests: Object.fromEntries(coverageMap.tests),
      lastUpdated: coverageMap.lastUpdated,
      rootDir: coverageMap.rootDir
    };

    await fs.promises.writeFile(
      this.coverageFilePath,
      JSON.stringify(serializable, null, 2),
      'utf-8'
    );
  }
}
