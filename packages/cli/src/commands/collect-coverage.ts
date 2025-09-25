/**
 * Command to collect per-test coverage by running tests individually
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { PerTestRunner } from '@tia-js/core';
import { loadConfig } from '../config';

export const collectCoverageCommand = new Command('collect')
  .description('Collect per-test coverage by running tests individually')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--test-command <command>', 'Command to run individual tests (e.g., "npx cypress run --spec")')
  .option('--cleanup', 'Clean coverage data between tests', false)
  .option('--dry-run', 'Show what would be run without executing', false)
  .action(async (options) => {
    console.log(chalk.bold.blue('🧪 Per-Test Coverage Collection'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    
    try {
      const config = await loadConfig(options.config);
      
      // Determine test command based on project structure
      let testCommand = options.testCommand;
      if (!testCommand) {
        // Auto-detect based on common patterns
        if (require('fs').existsSync('cypress.config.js')) {
          testCommand = 'npx cypress run --spec';
        } else if (require('fs').existsSync('jest.config.js')) {
          testCommand = 'npx jest';
        } else if (require('fs').existsSync('playwright.config.js')) {
          testCommand = 'npx playwright test';
        } else {
          throw new Error('Could not auto-detect test command. Please specify --test-command');
        }
      }
      
      console.log(chalk.blue('Configuration:'));
      console.log(`  Root directory: ${chalk.yellow(config.rootDir)}`);
      console.log(`  Test command: ${chalk.yellow(testCommand)}`);
      console.log(`  Cleanup between tests: ${chalk.yellow(options.cleanup ? 'Yes' : 'No')}`);
      console.log();
      
      const runner = new PerTestRunner({
        rootDir: config.rootDir,
        testCommand,
        testPattern: "**/*.{cy,test,spec}.js",
        coverageOutputPath: ".nyc_output/out.json",
        cleanupBetweenTests: options.cleanup
      });
      
      if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry run - discovering test files...'));
        const testFiles = await runner['discoverTestFiles']();
        
        console.log(chalk.bold(`Found ${testFiles.length} test files:`));
        for (const testFile of testFiles) {
          console.log(`  📁 ${testFile}`);
        }
        console.log();
        console.log(chalk.blue('Would run:'));
        for (const testFile of testFiles) {
          console.log(`  ${testCommand} "${testFile}"`);
        }
        return;
      }
      
      const spinner = ora('Running tests individually and collecting coverage...').start();
      
      try {
        const perTestData = await runner.collectPerTestCoverage();
        
        spinner.succeed(`Successfully collected coverage for ${perTestData.size} tests`);
        
        console.log();
        console.log(chalk.bold.green('📊 Per-Test Coverage Results:'));
        console.log();
        
        for (const [testFile, data] of perTestData) {
          console.log(chalk.cyan(`🧪 ${testFile}`));
          console.log(`   Covered files: ${chalk.yellow(data.executedFiles.length)}`);
          console.log(`   Duration: ${chalk.gray(data.metadata?.duration + 'ms')}`);
          console.log(`   Status: ${data.metadata?.status === 'passed' ? chalk.green('✅ Passed') : chalk.red('❌ Failed')}`);
          
          if (data.executedFiles.length > 0) {
            console.log('   Files:');
            data.executedFiles.slice(0, 5).forEach(file => {
              console.log(`     📁 ${file}`);
            });
            if (data.executedFiles.length > 5) {
              console.log(`     ... and ${data.executedFiles.length - 5} more`);
            }
          }
          console.log();
        }
        
        console.log(chalk.bold.blue('🎯 Next Steps:'));
        console.log('  • Run "tia coverage mapping" to see precise test-to-source relationships');
        console.log('  • Run "tia analyze --use-coverage" for accurate impact analysis');
        console.log('  • Per-test data is stored in .tia/coverage.json');
        
      } catch (error) {
        spinner.fail('Failed to collect per-test coverage');
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        console.log();
        console.log(chalk.yellow('💡 Troubleshooting:'));
        console.log('  • Ensure your test command works individually');
        console.log('  • Check that coverage instrumentation is enabled');
        console.log('  • Verify test files are discovered correctly with --dry-run');
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
