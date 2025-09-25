/**
 * Coverage-related CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TIAEngine } from '@tia-js/core';
import { loadConfig } from '../config';

export const coverageCommand = new Command('coverage')
  .alias('cov')
  .description('Manage test coverage data for TIA');

// Stats subcommand
coverageCommand
  .command('stats')
  .description('Show coverage statistics')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--json', 'Output results as JSON', false)
  .action(async (options) => {
    const spinner = ora('Loading coverage statistics...').start();
    
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      
      // Initialize TIA engine
      const engine = new TIAEngine(config);
      
      // Get coverage stats
      const stats = await engine.getCoverageStats();
      
      spinner.succeed('Coverage statistics loaded');
      
      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        displayCoverageStats(stats);
      }
      
    } catch (error) {
      spinner.fail('Failed to load coverage statistics');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Clear subcommand
coverageCommand
  .command('clear')
  .description('Clear all stored coverage data')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .action(async (options) => {
    if (!options.yes) {
      console.log(chalk.yellow('⚠️  This will permanently delete all coverage data.'));
      console.log(chalk.gray('Use --yes to skip this confirmation.'));
      process.exit(0);
    }
    
    const spinner = ora('Clearing coverage data...').start();
    
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      
      // Initialize TIA engine
      const engine = new TIAEngine(config);
      
      // Clear coverage data
      await engine.clearCoverageData();
      
      spinner.succeed('Coverage data cleared');
      
    } catch (error) {
      spinner.fail('Failed to clear coverage data');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function displayCoverageStats(stats: any): void {
  console.log();
  console.log(chalk.bold.blue('📊 Coverage Statistics'));
  console.log(chalk.gray('─'.repeat(40)));
  
  console.log();
  console.log(chalk.bold('Summary:'));
  console.log(`  Total tests with coverage: ${chalk.yellow(stats.totalTests)}`);
  console.log(`  Total source files covered: ${chalk.yellow(stats.totalSourceFiles)}`);
  console.log(`  Average files per test: ${chalk.yellow(stats.averageFilesPerTest.toFixed(1))}`);
  
  if (stats.lastUpdated > 0) {
    const lastUpdated = new Date(stats.lastUpdated);
    console.log(`  Last updated: ${chalk.gray(lastUpdated.toLocaleString())}`);
  } else {
    console.log(`  Last updated: ${chalk.gray('Never')}`);
  }
  
  console.log();
  
  if (stats.totalTests === 0) {
    console.log(chalk.yellow('ℹ️  No coverage data found.'));
    console.log(chalk.gray('   Run tests with coverage instrumentation to collect data.'));
    console.log(chalk.gray('   For Cypress: Use --use-coverage flag or @cypress/code-coverage'));
  } else {
    console.log(chalk.green('✅ Coverage data is available for TIA analysis.'));
    console.log(chalk.gray('   Use "tia analyze --use-coverage" to leverage this data.'));
  }
}
