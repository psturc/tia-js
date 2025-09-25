/**
 * Analyze command for TIA CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TIAEngine } from '@tia-js/core';
import { CypressAdapter } from '@tia-js/cypress';
import { PlaywrightAdapter } from '@tia-js/playwright';
import { JestAdapter } from '@tia-js/jest';
import { TIAConfig, TIAResult, formatDuration } from '@tia-js/common';
import { loadConfig } from '../config';
import { createTable, formatTestReason } from '../utils';

export const analyzeCommand = new Command('analyze')
  .alias('a')
  .description('Analyze test impact for changed files')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-b, --base <commit>', 'Base commit/branch to compare against', 'HEAD')
  .option('--include-unstaged', 'Include unstaged changes', false)
  .option('--include-untracked', 'Include untracked files', false)
  .option('-f, --framework <name>', 'Force specific framework (cypress, playwright, jest)')
  .option('--max-depth <number>', 'Maximum dependency analysis depth', '10')
  .option('--json', 'Output results as JSON', false)
  .option('--verbose', 'Verbose output', false)
  .option('--fail-on-no-tests', 'Exit with code 1 if no affected tests found', false)
  .option('--use-coverage', 'Use coverage-based analysis (requires prior test runs with coverage)', false)
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
      const result = options.useCoverage 
        ? await engine.analyzeCoverage({
            base: options.base,
            includeUnstaged: options.includeUnstaged,
            includeUntracked: options.includeUntracked
          })
        : await engine.analyze({
            base: options.base,
            includeUnstaged: options.includeUnstaged,
            includeUntracked: options.includeUntracked
          });

      spinner.succeed('Analysis completed');

      // Output results
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayAnalysisResults(result, options.verbose);
      }

      // Exit with appropriate code based on options
      if (options.failOnNoTests && result.affectedTests.length === 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
      
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function displayAnalysisResults(result: TIAResult, verbose: boolean): void {
  console.log();
  console.log(chalk.bold.blue('📊 Test Impact Analysis Results'));
  console.log(chalk.gray('─'.repeat(50)));
  
  // Summary
  console.log();
  console.log(chalk.bold('Summary:'));
  console.log(`  Changed files: ${chalk.yellow(result.changedFiles.length)}`);
  console.log(`  Affected tests: ${chalk.green(result.affectedTests.length)}`);
  console.log(`  Total tests: ${chalk.gray(result.totalTests)}`);
  console.log(`  Analysis time: ${chalk.cyan(formatDuration(result.metadata.analysisTime))}`);
  
  if (result.metadata.baseCommit) {
    console.log(`  Base commit: ${chalk.gray(result.metadata.baseCommit.slice(0, 8))}`);
  }

  // Changed files
  if (result.changedFiles.length > 0) {
    console.log();
    console.log(chalk.bold('Changed Files:'));
    
    const changedTable = createTable(['File', 'Change Type']);
    
    for (const file of result.changedFiles) {
      const relativePath = file.path.replace(process.cwd() + '/', '');
      const changeType = getChangeTypeIcon(file.changeType) + ' ' + file.changeType;
      changedTable.push([relativePath, changeType]);
    }
    
    console.log(changedTable.toString());
  }

  // Affected tests
  if (result.affectedTests.length > 0) {
    console.log();
    console.log(chalk.bold('Affected Tests:'));
    
    const testTable = createTable(['Test File', 'Reason', 'Priority']);
    
    for (const test of result.affectedTests) {
      const relativePath = test.path.replace(process.cwd() + '/', '');
      const reason = formatTestReason(test.reason);
      const priority = getPriorityIcon(test.priority) + ' ' + test.priority;
      testTable.push([relativePath, reason, priority]);
    }
    
    console.log(testTable.toString());

    // Verbose output
    if (verbose && result.affectedTests.length > 0) {
      console.log();
      console.log(chalk.bold('Test Details:'));
      
      for (const test of result.affectedTests.slice(0, 5)) { // Show first 5 tests
        console.log();
        console.log(chalk.cyan(`📄 ${test.path.replace(process.cwd() + '/', '')}`));
        console.log(`   Reason: ${formatTestReason(test.reason)}`);
        console.log(`   Priority: ${test.priority}`);
        
        if (test.metadata?.dependencies) {
          const deps = test.metadata.dependencies.slice(0, 3); // Show first 3 dependencies
          console.log(`   Dependencies: ${deps.map((d: string) => d.replace(process.cwd() + '/', '')).join(', ')}`);
          if (test.metadata.dependencies.length > 3) {
            console.log(`   ... and ${test.metadata.dependencies.length - 3} more`);
          }
        }
      }
      
      if (result.affectedTests.length > 5) {
        console.log();
        console.log(chalk.gray(`... and ${result.affectedTests.length - 5} more tests`));
      }
    }
  } else {
    console.log();
    console.log(chalk.yellow('⚠️  No affected tests found'));
    console.log(chalk.gray('This could mean:'));
    console.log(chalk.gray('  • No files have changed'));
    console.log(chalk.gray('  • Changed files have no test dependencies'));
    console.log(chalk.gray('  • Tests are not properly importing changed files'));
  }

  console.log();
}

function getChangeTypeIcon(changeType: string): string {
  switch (changeType) {
    case 'added': return chalk.green('✚');
    case 'modified': return chalk.yellow('●');
    case 'deleted': return chalk.red('✖');
    case 'renamed': return chalk.blue('➤');
    default: return '?';
  }
}

function getPriorityIcon(priority: number): string {
  if (priority >= 80) return chalk.red('🔴');
  if (priority >= 60) return chalk.yellow('🟡');
  if (priority >= 40) return chalk.blue('🔵');
  return chalk.gray('⚪');
}

