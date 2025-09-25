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

// Mapping subcommand
coverageCommand
  .command('mapping')
  .alias('map')
  .description('Show which tests cover which source files')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--format <format>', 'Output format: table, json, summary', 'table')
  .action(async (options) => {
    const spinner = ora('Analyzing coverage mapping...').start();
    
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      
      // Initialize TIA engine
      const engine = new TIAEngine(config);
      
      // Get NYC coverage data
      const nycReader = engine['coverageAnalyzer']['nycReader'];
      const hasNYC = nycReader.hasNYCCoverage();
      
      if (!hasNYC) {
        spinner.warn('No NYC coverage data found');
        console.log(chalk.yellow('ℹ️  Run tests with coverage to collect data:'));
        console.log(chalk.gray('   npm run test:coverage'));
        process.exit(0);
      }
      
      const coveredFiles = await nycReader.readNYCCoverage();
      const stats = await nycReader.getCoverageStats();
      
      // For each covered file, find which tests would exercise it
      const coverageAnalyzer = engine['coverageAnalyzer'];
      const mapping = new Map<string, string[]>();
      
      for (const sourceFile of coveredFiles) {
        const tests = await coverageAnalyzer['findTestsForSourceFile'](sourceFile);
        mapping.set(sourceFile, tests);
      }
      
      spinner.succeed('Coverage mapping analyzed');
      
      if (options.format === 'json') {
        console.log(JSON.stringify(Object.fromEntries(mapping), null, 2));
      } else if (options.format === 'summary') {
        displayMappingSummary(mapping, stats, coveredFiles);
      } else {
        // Table format (default)
        displayMappingTable(mapping, stats);
      }
      
    } catch (error) {
      spinner.fail('Failed to analyze coverage mapping');
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

function displayMappingTable(mapping: Map<string, string[]>, stats: any): void {
  console.log();
  console.log(chalk.bold.blue('📊 Test-to-Source Coverage Mapping'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log();
  
  if (mapping.size === 0) {
    console.log(chalk.yellow('No coverage mapping found.'));
    return;
  }
  
  console.log(chalk.bold('Source File → Tests That Exercise It'));
  console.log();
  
  for (const [sourceFile, tests] of mapping) {
    console.log(chalk.cyan(`📁 ${sourceFile}`));
    if (tests.length === 0) {
      console.log(chalk.gray('   └─ No specific tests identified (would run all E2E tests)'));
    } else {
      tests.forEach((test, index) => {
        const isLast = index === tests.length - 1;
        const prefix = isLast ? '   └─' : '   ├─';
        console.log(chalk.green(`${prefix} 🧪 ${test}`));
      });
    }
    console.log();
  }
  
  console.log(chalk.bold('Coverage Statistics:'));
  console.log(`  Statements: ${chalk.yellow(typeof stats.statements === 'object' ? JSON.stringify(stats.statements) : stats.statements)}`);
  console.log(`  Functions: ${chalk.yellow(typeof stats.functions === 'object' ? JSON.stringify(stats.functions) : stats.functions)}`);
  console.log(`  Branches: ${chalk.yellow(typeof stats.branches === 'object' ? JSON.stringify(stats.branches) : stats.branches)}`);
}

function displayMappingSummary(mapping: Map<string, string[]>, stats: any, coveredFiles: string[]): void {
  console.log();
  console.log(chalk.bold.blue('📊 Coverage Mapping Summary'));
  console.log(chalk.gray('─'.repeat(50)));
  
  const uniqueTests = new Set(Array.from(mapping.values()).flat());
  
  console.log(`Total covered files: ${chalk.yellow(coveredFiles.length)}`);
  console.log(`Total test files: ${chalk.yellow(uniqueTests.size)}`);
  console.log(`Coverage: ${chalk.green(stats.statements)} statements`);
  
  console.log();
  console.log(chalk.bold('Files by Test Count:'));
  
  for (const [sourceFile, tests] of mapping) {
    const testCount = tests.length || 'all E2E';
    console.log(`  ${sourceFile}: ${chalk.yellow(testCount)} tests`);
  }
}
