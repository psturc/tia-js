/**
 * Playwright adapter for Test Impact Analysis
 */

import * as path from 'path';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { 
  TIAAdapter, 
  TIAConfig, 
  TestRunResult, 
  TestResult,
  PlaywrightConfig
} from '@tia-js/common';
import { fileExists, findFiles, createLogger } from '@tia-js/common';

/**
 * Playwright Test Impact Analysis Adapter
 */
export class PlaywrightAdapter implements TIAAdapter {
  name = 'playwright';
  private logger = createLogger();

  /**
   * Detect if Playwright is available in the project
   */
  async detect(rootDir: string): Promise<boolean> {
    try {
      // Check for playwright.config.js/ts
      const configFiles = [
        'playwright.config.js',
        'playwright.config.ts',
        'playwright.config.mjs',
        'playwright.config.cjs'
      ];
      
      for (const configFile of configFiles) {
        if (await fileExists(path.join(rootDir, configFile))) {
          return true;
        }
      }

      // Check for tests directory with Playwright tests
      const testDirs = ['tests', 'e2e', 'test'];
      for (const testDir of testDirs) {
        const dir = path.join(rootDir, testDir);
        try {
          const files = await fs.readdir(dir);
          if (files.some(file => file.includes('.spec.') || file.includes('.test.'))) {
            return true;
          }
        } catch {
          // Directory doesn't exist
        }
      }

      // Check if @playwright/test is in package.json dependencies
      const packageJsonPath = path.join(rootDir, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        if (deps['@playwright/test'] || deps.playwright) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug('Playwright detection failed:', error);
      return false;
    }
  }

  /**
   * Find all Playwright test files
   */
  async findTestFiles(config: TIAConfig): Promise<string[]> {
    const playwrightConfig = await this.getPlaywrightConfig(config);
    
    // Default Playwright test patterns
    const defaultPatterns = [
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'e2e/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'test/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/*.{test,spec}.{js,jsx,ts,tsx}'
    ];

    let patterns = defaultPatterns;
    
    if (playwrightConfig.testMatch) {
      if (Array.isArray(playwrightConfig.testMatch)) {
        patterns = playwrightConfig.testMatch;
      } else {
        patterns = [playwrightConfig.testMatch];
      }
    } else if (playwrightConfig.testDir) {
      patterns = [`${playwrightConfig.testDir}/**/*.{test,spec}.{js,jsx,ts,tsx}`];
    }

    const testFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await findFiles(config.rootDir, [pattern]);
      testFiles.push(...files);
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Run Playwright tests
   */
  async runTests(testFiles: string[], config: TIAConfig): Promise<TestRunResult> {
    const startTime = Date.now();
    this.logger.info(`Running ${testFiles.length} Playwright tests...`);

    try {
      const playwrightConfig = await this.getPlaywrightConfig(config);
      const results = await this.executePlaywrightTests(testFiles, playwrightConfig, config);
      
      const duration = Date.now() - startTime;
      this.logger.info(`Playwright tests completed in ${duration}ms`);
      
      return {
        ...results,
        duration
      };
    } catch (error) {
      this.logger.error('Playwright test execution failed:', error);
      throw error;
    }
  }

  /**
   * Get Playwright-specific configuration
   */
  async getConfig(rootDir: string): Promise<Partial<TIAConfig>> {
    const playwrightConfig = await this.getPlaywrightConfig({ rootDir } as TIAConfig);
    
    return {
      frameworks: {
        playwright: playwrightConfig
      },
      testExtensions: ['.test.js', '.test.jsx', '.test.ts', '.test.tsx', '.spec.js', '.spec.jsx', '.spec.ts', '.spec.tsx']
    };
  }

  /**
   * Get Playwright configuration
   */
  private async getPlaywrightConfig(config: TIAConfig): Promise<PlaywrightConfig> {
    const rootDir = config.rootDir;
    let playwrightConfig: PlaywrightConfig = {};

    // Try to load from framework config
    if (config.frameworks?.playwright) {
      playwrightConfig = { ...config.frameworks.playwright };
    }

    // Try to detect and load Playwright config file
    const configFiles = [
      'playwright.config.js',
      'playwright.config.ts',
      'playwright.config.mjs',
      'playwright.config.cjs'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(rootDir, configFile);
      if (await fileExists(configPath)) {
        playwrightConfig.configFile = configPath;
        
        try {
          // Try to load and parse the config file
          // This is a simplified approach - in production you'd want to actually import and evaluate the config
          const configContent = await fs.readFile(configPath, 'utf-8');
          
          // Look for common configuration patterns
          const testDirMatch = configContent.match(/testDir\s*:\s*['"`]([^'"`]+)['"`]/);
          if (testDirMatch) {
            playwrightConfig.testDir = testDirMatch[1];
          }
          
          const testMatchMatch = configContent.match(/testMatch\s*:\s*['"`]([^'"`]+)['"`]/);
          if (testMatchMatch) {
            playwrightConfig.testMatch = testMatchMatch[1];
          }
          
        } catch (error) {
          this.logger.warn(`Failed to parse Playwright config file ${configFile}:`, error);
        }
        break;
      }
    }

    return playwrightConfig;
  }

  /**
   * Execute Playwright tests and parse results
   */
  private async executePlaywrightTests(
    testFiles: string[], 
    playwrightConfig: PlaywrightConfig, 
    config: TIAConfig
  ): Promise<Omit<TestRunResult, 'duration'>> {
    return new Promise((resolve, reject) => {
      const args = ['test'];
      
      // Add config file if specified
      if (playwrightConfig.configFile) {
        args.push('--config', playwrightConfig.configFile);
      }

      // Add specific test files
      if (testFiles.length > 0) {
        // Playwright expects relative paths or absolute paths
        const relativeTestFiles = testFiles.map(file => 
          path.relative(config.rootDir, file)
        );
        args.push(...relativeTestFiles);
      }

      // Add reporter for structured output
      args.push('--reporter=json');

      const playwright = spawn('npx', ['playwright', ...args], {
        cwd: config.rootDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      playwright.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      playwright.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      playwright.on('close', (code) => {
        try {
          const result = this.parsePlaywrightResults(stdout, stderr, code === 0);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Playwright results: ${error.message}`));
        }
      });

      playwright.on('error', (error) => {
        reject(new Error(`Failed to run Playwright: ${error.message}`));
      });
    });
  }

  /**
   * Parse Playwright test results from JSON output
   */
  private parsePlaywrightResults(
    stdout: string, 
    stderr: string, 
    success: boolean
  ): Omit<TestRunResult, 'duration'> {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const tests: TestResult[] = [];

    try {
      // Try to parse JSON output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (data.suites) {
          // Parse Playwright JSON format
          const parseSuite = (suite: any) => {
            if (suite.specs) {
              for (const spec of suite.specs) {
                if (spec.tests) {
                  for (const test of spec.tests) {
                    const result: TestResult = {
                      file: spec.file || suite.file || 'unknown',
                      name: test.title || 'unknown',
                      status: test.status === 'passed' ? 'passed' : 
                             test.status === 'failed' ? 'failed' : 'skipped',
                      duration: test.duration || 0,
                      error: test.error ? test.error.message : undefined
                    };
                    
                    tests.push(result);
                    
                    switch (result.status) {
                      case 'passed':
                        passed++;
                        break;
                      case 'failed':
                        failed++;
                        break;
                      case 'skipped':
                        skipped++;
                        break;
                    }
                  }
                }
              }
            }
            
            if (suite.suites) {
              for (const subSuite of suite.suites) {
                parseSuite(subSuite);
              }
            }
          };
          
          for (const suite of data.suites) {
            parseSuite(suite);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse Playwright JSON output, using basic parsing:', error);
      
      // Fallback: parse from stderr/stdout text
      const output = stdout + stderr;
      
      // Basic pattern matching for Playwright output
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);
      
      if (passedMatch) passed = parseInt(passedMatch[1], 10);
      if (failedMatch) failed = parseInt(failedMatch[1], 10);
      if (skippedMatch) skipped = parseInt(skippedMatch[1], 10);
    }

    return {
      success: success && failed === 0,
      passed,
      failed,
      skipped,
      tests
    };
  }
}
