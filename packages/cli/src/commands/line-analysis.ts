/**
 * Line-level Test Impact Analysis command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
// Using simple table format to avoid external dependencies
import { LineLevelAnalyzer } from '@tia-js/core';
import { loadConfig } from '../config';

export const lineAnalysisCommand = new Command('line-analysis')
  .alias('lines')
  .description('Analyze which tests cover the exact lines that changed')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--files <files...>', 'Specific files to analyze (default: all changed files)')
  .option('--format <format>', 'Output format: table, json, detailed', 'table')
  .action(async (options) => {
    console.log(chalk.bold.blue('🎯 Line-Level Test Impact Analysis'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    
    const spinner = ora('Analyzing changed lines...').start();
    
    try {
      // Determine the actual working directory where the command was invoked
      const actualWorkingDir = process.env.INIT_CWD || process.cwd();
      
      // Load config relative to the actual working directory
      const configPath = options.config ? 
        (require('path').isAbsolute(options.config) ? options.config : require('path').resolve(actualWorkingDir, options.config)) :
        undefined;
      
      const config = await loadConfig(configPath, { rootDir: actualWorkingDir });
      const { createLogger } = require('@tia-js/common');
      const logger = createLogger('info');
      
      // Use config.rootDir for analysis, fallback to current working directory
      const workingDir = config.rootDir || process.cwd();
      const analyzer = new LineLevelAnalyzer(workingDir, logger);
      
      // Determine which files to analyze
      let changedFiles: string[];
      if (options.files) {
        changedFiles = options.files;
        spinner.text = `Analyzing specified files: ${changedFiles.join(', ')}`;
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
              const isJSFile = f.startsWith('src/') && 
                               (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx')) &&
                               !f.includes('.test.') && !f.includes('.spec.');
              
              const isGoFile = f.endsWith('.go') && !f.endsWith('_test.go');
              const isPythonFile = f.endsWith('.py') && !f.includes('test_') && !f.endsWith('_test.py');
              
              return isJSFile || isGoFile || isPythonFile;
            });
          
          if (changedFiles.length === 0) {
            spinner.info('No changed files detected');
            console.log(chalk.yellow('💡 Make some changes to source files and try again'));
            return;
          }
          
          spinner.text = `Analyzing ${changedFiles.length} changed files...`;
        } catch (error) {
          spinner.fail('Failed to detect changed files');
          console.error(chalk.red('Error:'), 'Could not get changed files from git');
          return;
        }
      }
      
      // Check if coverage data exists
      const path = require('path');
      const fs = require('fs');
      const coverageDir = path.join(workingDir, '.tia', 'per-test-coverage');
      
      if (!fs.existsSync(coverageDir)) {
        spinner.fail('Coverage data not found');
        console.log();
        console.log(chalk.yellow('⚠️  No coverage data found in .tia/per-test-coverage/'));
        console.log();
        console.log(chalk.bold('To use TIA:'));
        console.log('  1. Sync coverage data from your TIA server to .tia/per-test-coverage/');
        console.log('  2. Ensure coverage data is up-to-date with the main branch');
        console.log('  3. Run TIA commands against your PR changes');
        process.exit(1);
      }
      
      // Check if coverage directory has files
      const coverageFiles = fs.readdirSync(coverageDir);
      
      if (coverageFiles.length === 0) {
        spinner.fail('Coverage directory is empty');
        console.log();
        console.log(chalk.yellow('⚠️  Coverage directory exists but is empty'));
        process.exit(1);
      }
      
      // Perform line-level analysis
      const result = await analyzer.analyzeChangedLines(changedFiles);
      
      spinner.succeed(`Line-level analysis completed`);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.format === 'detailed') {
        displayDetailedResults(result);
      } else {
        displayTableResults(result);
      }
      
    } catch (error) {
      spinner.fail('Line-level analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function displayTableResults(result: any): void {
  console.log();
  console.log(chalk.bold.green('📊 Line-Level Coverage Results'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log();
  
  console.log(chalk.bold('Summary:'));
  console.log(`  Total changed lines: ${chalk.yellow(result.summary.totalChangedLines)}`);
  console.log(`  Covered changed lines: ${chalk.green(result.summary.coveredChangedLines)}`);
  console.log(`  Coverage percentage: ${chalk.cyan(result.summary.coveragePercentage.toFixed(1) + '%')}`);
  console.log(`  Affected tests: ${chalk.yellow(result.summary.affectedTests)}`);
  console.log();

  if (result.coveringTests.length > 0) {
    console.log(chalk.bold('Tests Covering Changed Lines:'));
    console.log();
    
    // Simple table format
    console.log(chalk.cyan('┌─────────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan('│') + chalk.bold(' Test Name → Covered Lines → Coverage %                         ') + chalk.cyan('│'));
    console.log(chalk.cyan('├─────────────────────────────────────────────────────────────────────┤'));

    for (const test of result.coveringTests) {
      const lineRange = test.coveredLines.length > 5 
        ? `${test.coveredLines.slice(0, 3).join(', ')}, ...+${test.coveredLines.length - 3}`
        : test.coveredLines.join(', ');
        
      const testName = test.testName.length > 35 ? test.testName.slice(0, 32) + '...' : test.testName;
      const coverage = `${test.coveragePercentage.toFixed(1)}%`;
      
      console.log(chalk.cyan('│') + ` ${chalk.yellow(testName.padEnd(35))} ${chalk.green(coverage.padStart(6))} ` + chalk.cyan('│'));
      console.log(chalk.cyan('│') + chalk.gray(`   ${test.testFile.padEnd(45)}   `) + chalk.cyan('│'));
      console.log(chalk.cyan('│') + chalk.gray(`   Lines: ${lineRange.padEnd(38)}   `) + chalk.cyan('│'));
      console.log(chalk.cyan('├─────────────────────────────────────────────────────────────────────┤'));
    }
    
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────────────────┘'));
  } else {
    console.log(chalk.yellow('⚠️  No tests found covering the changed lines'));
    console.log(chalk.gray('   This could mean:'));
    console.log(chalk.gray('   • The changed lines are not yet covered by tests'));
    console.log(chalk.gray('   • The coverage data is outdated'));
    console.log(chalk.gray('   • The changes are in non-executable code (comments, etc.)'));
  }

  if (result.uncoveredLines.length > 0) {
    console.log();
    console.log(chalk.bold.red('❌ Uncovered Changed Lines:'));
    console.log(`  Lines ${result.uncoveredLines.join(', ')} have no test coverage`);
    console.log(chalk.gray('  Consider adding tests for these lines'));
  }
}

function displayDetailedResults(result: any): void {
  console.log();
  console.log(chalk.bold.blue('🔍 Detailed Line-Level Analysis'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log();

  // Group by file
  const fileGroups = new Map<string, any[]>();
  
  for (const change of result.changedLines) {
    if (!fileGroups.has(change.file)) {
      fileGroups.set(change.file, []);
    }
    fileGroups.get(change.file)!.push(change);
  }

  for (const [file, changes] of fileGroups) {
    console.log(chalk.cyan(`📁 ${file}`));
    
    for (const change of changes) {
      console.log(`   📝 Changed lines: ${change.lines.join(', ')}`);
      
      const testsForFile = result.coveringTests.filter((t: any) => 
        t.coveredLines.some((line: number) => change.lines.includes(line))
      );
      
      if (testsForFile.length > 0) {
        console.log(chalk.green('   ✅ Covered by:'));
        for (const test of testsForFile) {
          const relevantLines = test.coveredLines.filter((line: number) => change.lines.includes(line));
          console.log(`      🧪 ${test.testName}`);
          console.log(`         Lines: ${relevantLines.join(', ')} (${test.coveragePercentage.toFixed(1)}%)`);
        }
      } else {
        console.log(chalk.red('   ❌ No test coverage for these lines'));
      }
    }
    console.log();
  }
}
