/**
 * Run command for TIA CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TIAEngine } from '@tia-js/core';
import { CypressAdapter } from '@tia-js/cypress';
import { PlaywrightAdapter } from '@tia-js/playwright';
import { JestAdapter } from '@tia-js/jest';
import { formatDuration } from '@tia-js/common';
import { loadConfig } from '../config';

export const runCommand = new Command('run')
  .alias('r')
  .description('Analyze and run affected tests')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-b, --base <commit>', 'Base commit/branch to compare against', 'HEAD')
  .option('--include-unstaged', 'Include unstaged changes', false)
  .option('--include-untracked', 'Include untracked files', false)
  .option('-f, --framework <name>', 'Force specific framework (cypress, playwright, jest)')
  .option('--max-depth <number>', 'Maximum dependency analysis depth', '10')
  .option('--dry-run', 'Show what would be run without executing tests', false)
  .option('-y, --yes', 'Skip confirmation prompts', false)
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    const spinner = ora('Initializing Test Impact Analysis...').start();
    
    try {
      // Load configuration
      const config = await loadConfig(options.config, {
        maxDepth: parseInt(options.maxDepth, 10),
        includeIndirect: true
      });

      spinner.text = 'Setting up TIA engine...';
      
      // Create TIA engine
      const engine = new TIAEngine(config);
      
      // Register adapters
      engine.registerAdapter(new CypressAdapter());
      engine.registerAdapter(new PlaywrightAdapter());
      engine.registerAdapter(new JestAdapter());

      spinner.text = 'Analyzing file changes and dependencies...';
      
      // Run analysis
      const result = await engine.analyze({
        base: options.base,
        includeUnstaged: options.includeUnstaged,
        includeUntracked: options.includeUntracked
      });

      spinner.succeed('Analysis completed');

      // Display summary
      console.log();
      console.log(chalk.bold.blue('🧪 Test Impact Analysis & Execution'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(`Found ${chalk.yellow(result.changedFiles.length)} changed files`);
      console.log(`Found ${chalk.green(result.affectedTests.length)} affected tests`);
      console.log(`Analysis completed in ${chalk.cyan(formatDuration(result.metadata.analysisTime))}`);

      if (result.affectedTests.length === 0) {
        console.log();
        console.log(chalk.yellow('⚠️  No affected tests found - nothing to run'));
        process.exit(0);
      }

      // Show affected tests
      console.log();
      console.log(chalk.bold('Affected Tests:'));
      for (const test of result.affectedTests.slice(0, 10)) {
        const relativePath = test.path.replace(process.cwd() + '/', '');
        console.log(`  ${chalk.gray('•')} ${relativePath} ${chalk.gray(`(${test.reason})`)}`);
      }
      
      if (result.affectedTests.length > 10) {
        console.log(`  ${chalk.gray(`... and ${result.affectedTests.length - 10} more tests`)}`);
      }

      if (options.dryRun) {
        console.log();
        console.log(chalk.yellow('🔍 Dry run mode - tests would be executed but not actually run'));
        process.exit(0);
      }

      // Confirmation prompt
      if (!options.yes) {
        console.log();
        const { shouldRun } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldRun',
            message: `Do you want to run ${result.affectedTests.length} affected tests?`,
            default: true
          }
        ]);

        if (!shouldRun) {
          console.log(chalk.yellow('Test execution cancelled'));
          process.exit(0);
        }
      }

      // Run tests
      console.log();
      spinner.start('Running affected tests...');
      
      const testStartTime = Date.now();
      
      try {
        await engine.runTests(result, options.framework);
        const testDuration = Date.now() - testStartTime;
        
        spinner.succeed(`All tests passed in ${formatDuration(testDuration)}`);
        console.log();
        console.log(chalk.green('✅ Test execution completed successfully'));
        process.exit(0);
        
      } catch (testError) {
        const testDuration = Date.now() - testStartTime;
        spinner.fail(`Tests failed after ${formatDuration(testDuration)}`);
        
        console.log();
        console.log(chalk.red('❌ Some tests failed'));
        
        if (options.verbose && testError instanceof Error) {
          console.log();
          console.log(chalk.bold('Error details:'));
          console.log(testError.message);
        }
        
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Test Impact Analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      
      if (options.verbose && error instanceof Error && error.stack) {
        console.log();
        console.log(chalk.gray('Stack trace:'));
        console.log(error.stack);
      }
      
      process.exit(1);
    }
  });
