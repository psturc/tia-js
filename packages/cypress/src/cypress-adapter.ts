/**
 * Cypress adapter for Test Impact Analysis
 */

import * as path from 'path';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { 
  TIAAdapter, 
  TIAConfig, 
  TestRunResult, 
  TestResult,
  CypressConfig
} from '@tia-js/common';
import { fileExists, findFiles, createLogger } from '@tia-js/common';

/**
 * Cypress Test Impact Analysis Adapter
 */
export class CypressAdapter implements TIAAdapter {
  name = 'cypress';
  private logger = createLogger();

  /**
   * Detect if Cypress is available in the project
   */
  async detect(rootDir: string): Promise<boolean> {
    try {
      // Check for cypress.config.js/ts or cypress.json
      const configFiles = [
        'cypress.config.js',
        'cypress.config.ts',
        'cypress.json'
      ];
      
      for (const configFile of configFiles) {
        if (await fileExists(path.join(rootDir, configFile))) {
          return true;
        }
      }

      // Check for cypress directory
      const cypressDir = path.join(rootDir, 'cypress');
      try {
        const stat = await fs.stat(cypressDir);
        if (stat.isDirectory()) {
          return true;
        }
      } catch {
        // Directory doesn't exist
      }

      // Check if cypress is in package.json dependencies
      const packageJsonPath = path.join(rootDir, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        if (deps.cypress) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug('Cypress detection failed:', error);
      return false;
    }
  }

  /**
   * Find all Cypress test files
   */
  async findTestFiles(config: TIAConfig): Promise<string[]> {
    const cypressConfig = await this.getCypressConfig(config);
    
    // Default Cypress spec patterns
    const defaultPatterns = [
      'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/integration/**/*.spec.{js,jsx,ts,tsx}',
      'cypress/integration/**/*.test.{js,jsx,ts,tsx}',
      'cypress/component/**/*.cy.{js,jsx,ts,tsx}'
    ];

    let patterns = defaultPatterns;
    
    if (cypressConfig.specPattern) {
      if (Array.isArray(cypressConfig.specPattern)) {
        patterns = cypressConfig.specPattern;
      } else {
        patterns = [cypressConfig.specPattern];
      }
    }

    const testFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await findFiles(config.rootDir, [pattern]);
      testFiles.push(...files);
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Run Cypress tests
   */
  async runTests(testFiles: string[], config: TIAConfig): Promise<TestRunResult> {
    const startTime = Date.now();
    this.logger.info(`Running ${testFiles.length} Cypress tests...`);

    try {
      const cypressConfig = await this.getCypressConfig(config);
      const results = await this.executeCypressTests(testFiles, cypressConfig, config);
      
      const duration = Date.now() - startTime;
      this.logger.info(`Cypress tests completed in ${duration}ms`);
      
      return {
        ...results,
        duration
      };
    } catch (error) {
      this.logger.error('Cypress test execution failed:', error);
      throw error;
    }
  }

  /**
   * Get Cypress-specific configuration
   */
  async getConfig(rootDir: string): Promise<Partial<TIAConfig>> {
    const cypressConfig = await this.getCypressConfig({ rootDir } as TIAConfig);
    
    return {
      frameworks: {
        cypress: cypressConfig
      },
      testExtensions: ['.cy.js', '.cy.jsx', '.cy.ts', '.cy.tsx', '.spec.js', '.spec.jsx', '.spec.ts', '.spec.tsx']
    };
  }

  /**
   * Get Cypress configuration
   */
  private async getCypressConfig(config: TIAConfig): Promise<CypressConfig> {
    const rootDir = config.rootDir;
    let cypressConfig: CypressConfig = {};

    // Try to load from framework config
    if (config.frameworks?.cypress) {
      cypressConfig = { ...config.frameworks.cypress };
    }

    // Try to detect and load Cypress config file
    const configFiles = [
      'cypress.config.js',
      'cypress.config.ts',
      'cypress.json'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(rootDir, configFile);
      if (await fileExists(configPath)) {
        cypressConfig.configFile = configPath;
        
        try {
          if (configFile === 'cypress.json') {
            // Legacy JSON config
            const jsonConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
            cypressConfig = {
              ...cypressConfig,
              specPattern: jsonConfig.testFiles || jsonConfig.integrationFolder ? 
                `${jsonConfig.integrationFolder}/**/*.spec.{js,jsx,ts,tsx}` : undefined,
              supportFile: jsonConfig.supportFile
            };
          }
        } catch (error) {
          this.logger.warn(`Failed to parse Cypress config file ${configFile}:`, error);
        }
        break;
      }
    }

    return cypressConfig;
  }

  /**
   * Execute Cypress tests and parse results
   */
  private async executeCypressTests(
    testFiles: string[], 
    cypressConfig: CypressConfig, 
    config: TIAConfig
  ): Promise<Omit<TestRunResult, 'duration'>> {
    return new Promise((resolve, reject) => {
      const args = ['run'];
      
      // Add config file if specified
      if (cypressConfig.configFile) {
        args.push('--config-file', cypressConfig.configFile);
      }

      // Add specific test files
      if (testFiles.length > 0) {
        // Cypress expects relative paths
        const relativeTestFiles = testFiles.map(file => 
          path.relative(config.rootDir, file)
        );
        args.push('--spec', relativeTestFiles.join(','));
      }

      // Run in headless mode
      args.push('--headless');
      
      // Add reporter for structured output
      args.push('--reporter', 'json');

      const cypress = spawn('npx', ['cypress', ...args], {
        cwd: config.rootDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      cypress.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      cypress.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      cypress.on('close', (code) => {
        try {
          const result = this.parseCypressResults(stdout, stderr, code === 0);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Cypress results: ${error.message}`));
        }
      });

      cypress.on('error', (error) => {
        reject(new Error(`Failed to run Cypress: ${error.message}`));
      });
    });
  }

  /**
   * Parse Cypress test results from JSON output
   */
  private parseCypressResults(
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
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          if (data.tests) {
            // Cypress JSON format
            for (const test of data.tests) {
              const result: TestResult = {
                file: test.file || 'unknown',
                name: test.title || test.fullTitle || 'unknown',
                status: test.state === 'passed' ? 'passed' : 
                       test.state === 'failed' ? 'failed' : 'skipped',
                duration: test.duration || 0,
                error: test.err ? test.err.message : undefined
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
        } catch {
          // Skip lines that aren't JSON
          continue;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse Cypress JSON output, using basic parsing:', error);
      
      // Fallback: parse from stderr/stdout text
      const output = stdout + stderr;
      
      // Basic pattern matching for Cypress output
      const passedMatch = output.match(/(\d+) passing/);
      const failedMatch = output.match(/(\d+) failing/);
      const skippedMatch = output.match(/(\d+) pending/);
      
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
