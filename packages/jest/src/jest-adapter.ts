/**
 * Jest adapter for Test Impact Analysis
 */

import * as path from 'path';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { 
  TIAAdapter, 
  TIAConfig, 
  TestRunResult, 
  TestResult,
  JestConfig
} from '@tia-js/common';
import { fileExists, findFiles, createLogger } from '@tia-js/common';

/**
 * Jest Test Impact Analysis Adapter
 */
export class JestAdapter implements TIAAdapter {
  name = 'jest';
  private logger = createLogger();

  /**
   * Detect if Jest is available in the project
   */
  async detect(rootDir: string): Promise<boolean> {
    try {
      // Check for Jest config files
      const configFiles = [
        'jest.config.js',
        'jest.config.ts',
        'jest.config.mjs',
        'jest.config.cjs',
        'jest.config.json'
      ];
      
      for (const configFile of configFiles) {
        if (await fileExists(path.join(rootDir, configFile))) {
          return true;
        }
      }

      // Check for Jest configuration in package.json
      const packageJsonPath = path.join(rootDir, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        // Check dependencies
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        if (deps.jest || deps['@jest/core']) {
          return true;
        }

        // Check for jest config in package.json
        if (packageJson.jest) {
          return true;
        }

        // Check for test script using jest
        if (packageJson.scripts?.test?.includes('jest')) {
          return true;
        }
      }

      // Check for common test file patterns that might indicate Jest usage
      const testPatterns = [
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        '**/__tests__/**/*.{js,jsx,ts,tsx}'
      ];

      for (const pattern of testPatterns) {
        const testFiles = await findFiles(rootDir, [pattern], ['node_modules/**']);
        if (testFiles.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug('Jest detection failed:', error);
      return false;
    }
  }

  /**
   * Find all Jest test files
   */
  async findTestFiles(config: TIAConfig): Promise<string[]> {
    const jestConfig = await this.getJestConfig(config);
    
    // Default Jest test patterns
    const defaultPatterns = [
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/*.{test,spec}.{js,jsx,ts,tsx}'
    ];

    let patterns = defaultPatterns;
    
    if (jestConfig.testMatch) {
      patterns = jestConfig.testMatch;
    }

    const testFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await findFiles(config.rootDir, [pattern], ['node_modules/**']);
      testFiles.push(...files);
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Run Jest tests
   */
  async runTests(testFiles: string[], config: TIAConfig): Promise<TestRunResult> {
    const startTime = Date.now();
    this.logger.info(`Running ${testFiles.length} Jest tests...`);

    try {
      const jestConfig = await this.getJestConfig(config);
      const results = await this.executeJestTests(testFiles, jestConfig, config);
      
      const duration = Date.now() - startTime;
      this.logger.info(`Jest tests completed in ${duration}ms`);
      
      return {
        ...results,
        duration
      };
    } catch (error) {
      this.logger.error('Jest test execution failed:', error);
      throw error;
    }
  }

  /**
   * Get Jest-specific configuration
   */
  async getConfig(rootDir: string): Promise<Partial<TIAConfig>> {
    const jestConfig = await this.getJestConfig({ rootDir } as TIAConfig);
    
    return {
      frameworks: {
        jest: jestConfig
      },
      testExtensions: ['.test.js', '.test.jsx', '.test.ts', '.test.tsx', '.spec.js', '.spec.jsx', '.spec.ts', '.spec.tsx']
    };
  }

  /**
   * Get Jest configuration
   */
  private async getJestConfig(config: TIAConfig): Promise<JestConfig> {
    const rootDir = config.rootDir;
    let jestConfig: JestConfig = {};

    // Try to load from framework config
    if (config.frameworks?.jest) {
      jestConfig = { ...config.frameworks.jest };
    }

    // Try to detect and load Jest config file
    const configFiles = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.mjs',
      'jest.config.cjs',
      'jest.config.json'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(rootDir, configFile);
      if (await fileExists(configPath)) {
        jestConfig.configFile = configPath;
        
        try {
          if (configFile.endsWith('.json')) {
            // JSON config
            const jsonConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
            jestConfig = {
              ...jestConfig,
              testMatch: jsonConfig.testMatch,
              setupFiles: jsonConfig.setupFiles,
              setupFilesAfterEnv: jsonConfig.setupFilesAfterEnv
            };
          } else {
            // JavaScript/TypeScript config - simplified parsing
            const configContent = await fs.readFile(configPath, 'utf-8');
            
            // Look for common configuration patterns
            const testMatchMatch = configContent.match(/testMatch\s*:\s*\[([\s\S]*?)\]/);
            if (testMatchMatch) {
              try {
                const testMatchStr = testMatchMatch[1]
                  .replace(/'/g, '"')
                  .replace(/,\s*$/, ''); // Remove trailing comma
                jestConfig.testMatch = JSON.parse(`[${testMatchStr}]`);
              } catch {
                // Fallback to default patterns
              }
            }
            
            const setupFilesMatch = configContent.match(/setupFiles\s*:\s*\[([\s\S]*?)\]/);
            if (setupFilesMatch) {
              try {
                const setupFilesStr = setupFilesMatch[1]
                  .replace(/'/g, '"')
                  .replace(/,\s*$/, '');
                jestConfig.setupFiles = JSON.parse(`[${setupFilesStr}]`);
              } catch {
                // Ignore parsing errors
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to parse Jest config file ${configFile}:`, error);
        }
        break;
      }
    }

    // Check for Jest config in package.json
    const packageJsonPath = path.join(rootDir, 'package.json');
    if (await fileExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (packageJson.jest) {
          jestConfig = {
            ...jestConfig,
            testMatch: packageJson.jest.testMatch || jestConfig.testMatch,
            setupFiles: packageJson.jest.setupFiles || jestConfig.setupFiles,
            setupFilesAfterEnv: packageJson.jest.setupFilesAfterEnv || jestConfig.setupFilesAfterEnv
          };
        }
      } catch (error) {
        this.logger.warn('Failed to parse package.json Jest config:', error);
      }
    }

    return jestConfig;
  }

  /**
   * Execute Jest tests and parse results
   */
  private async executeJestTests(
    testFiles: string[], 
    jestConfig: JestConfig, 
    config: TIAConfig
  ): Promise<Omit<TestRunResult, 'duration'>> {
    return new Promise((resolve, reject) => {
      const args: string[] = [];
      
      // Add config file if specified
      if (jestConfig.configFile) {
        args.push('--config', jestConfig.configFile);
      }

      // Add specific test files
      if (testFiles.length > 0) {
        // Jest can handle both relative and absolute paths
        const relativeTestFiles = testFiles.map(file => 
          path.relative(config.rootDir, file)
        );
        args.push(...relativeTestFiles);
      }

      // Add JSON reporter for structured output
      args.push('--json');
      
      // Disable coverage to speed up tests
      args.push('--coverage=false');
      
      // Run tests without watch mode
      args.push('--watchAll=false');

      const jest = spawn('npx', ['jest', ...args], {
        cwd: config.rootDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        try {
          const result = this.parseJestResults(stdout, stderr, code === 0);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Jest results: ${error instanceof Error ? error.message : String(error)}`));
        }
      });

      jest.on('error', (error) => {
        reject(new Error(`Failed to run Jest: ${error.message}`));
      });
    });
  }

  /**
   * Parse Jest test results from JSON output
   */
  private parseJestResults(
    stdout: string, 
    stderr: string, 
    success: boolean
  ): Omit<TestRunResult, 'duration'> {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const tests: TestResult[] = [];

    try {
      // Jest outputs JSON on stdout when using --json flag
      const data = JSON.parse(stdout);
      
      if (data.testResults) {
        for (const testResult of data.testResults) {
          if (testResult.assertionResults) {
            for (const assertion of testResult.assertionResults) {
              const result: TestResult = {
                file: testResult.name || 'unknown',
                name: assertion.fullName || assertion.title || 'unknown',
                status: assertion.status === 'passed' ? 'passed' : 
                       assertion.status === 'failed' ? 'failed' : 'skipped',
                duration: assertion.duration || 0,
                error: assertion.failureMessages?.join('\n') || undefined
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

      // Use Jest's summary if available
      if (data.numPassedTests !== undefined) passed = data.numPassedTests;
      if (data.numFailedTests !== undefined) failed = data.numFailedTests;
      if (data.numPendingTests !== undefined) skipped = data.numPendingTests;

    } catch (error) {
      this.logger.warn('Failed to parse Jest JSON output, using basic parsing:', error);
      
      // Fallback: parse from stderr/stdout text
      const output = stdout + stderr;
      
      // Basic pattern matching for Jest output
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
