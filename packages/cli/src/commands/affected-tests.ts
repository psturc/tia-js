/**
 * Command to output comma-separated list of affected test files for CI/CD integration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { LineLevelAnalyzer } from '@tia-js/core';
import { loadConfig } from '../config';

export const affectedTestsCommand = new Command('affected-tests')
  .description('Output comma-separated list of affected test files (for CI/CD integration)')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--files <files...>', 'Specific files to analyze (default: all changed files)')
  .option('--format <format>', 'Output format: files, specs, or detailed', 'files')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const { createLogger } = require('@tia-js/common');
      const logger = createLogger('error'); // Only show errors to keep output clean
      
      // Use current working directory for analysis
      const workingDir = process.cwd();
      const analyzer = new LineLevelAnalyzer(workingDir, logger);
      
      // Determine which files to analyze
      let changedFiles: string[];
      if (options.files) {
        changedFiles = options.files;
      } else {
        // Get changed files from git
        const { execSync } = require('child_process');
        try {
          const gitOutput = execSync('git diff --name-only HEAD', { 
            cwd: workingDir, 
            encoding: 'utf-8' 
          });
          changedFiles = gitOutput.trim().split('\n')
            .filter((f: string) => f.length > 0)
            .map((f: string) => {
              // Convert git repo-relative paths to working directory-relative paths
              const path = require('path');
              const repoRoot = execSync('git rev-parse --show-toplevel', { 
                cwd: workingDir, 
                encoding: 'utf-8' 
              }).trim();
              const absolutePath = path.resolve(repoRoot, f);
              return path.relative(workingDir, absolutePath);
            })
            .filter((f: string) => !f.startsWith('../')) // Only include files within the working directory
            .filter((f: string) => {
              // Only analyze source files, not config/coverage/test files
              return f.startsWith('src/') && 
                     (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx')) &&
                     !f.includes('.test.') && !f.includes('.spec.');
            });
          
          if (changedFiles.length === 0) {
            // No affected tests - output empty string
            console.log('');
            return;
          }
        } catch (error) {
          console.error(chalk.red('❌ Failed to detect changed files'));
          process.exit(1);
        }
      }
      
      // Check if coverage data exists
      const path = require('path');
      const fs = require('fs');
      const coverageDir = path.join(workingDir, '.tia', 'per-test-coverage');
      
      if (!fs.existsSync(coverageDir)) {
        console.error('ERROR: No coverage data found in .tia/per-test-coverage/');
        console.error('Sync coverage data from your TIA server before running analysis');
        process.exit(1);
      }
      
      // Perform line-level analysis
      const result = await analyzer.analyzeChangedLines(changedFiles);
      
      if (result.summary.affectedTests === 0) {
        // No affected tests - output empty string for CI/CD
        console.log('');
        return;
      }
      
      // Extract unique test files
      const affectedTests = new Set<string>();
      
      for (const test of result.coveringTests) {
        if (options.format === 'specs') {
          // Extract just the spec file (before :: if per-test format)
          const specFile = test.testFile.includes('::') 
            ? test.testFile.split('::')[0] 
            : test.testFile;
          affectedTests.add(specFile);
        } else {
          // Full test identifier
          affectedTests.add(test.testFile);
        }
      }
      
      // Output as comma-separated list
      const testList = Array.from(affectedTests).sort();
      
      if (options.format === 'detailed') {
        // Detailed output for debugging
        console.log(chalk.bold('🎯 Affected Tests:'));
        testList.forEach(test => console.log(`  • ${test}`));
        console.log();
        console.log(chalk.gray('For CI/CD: ') + testList.join(','));
      } else {
        // Clean output for CI/CD integration
        console.log(testList.join(','));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to analyze affected tests'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
