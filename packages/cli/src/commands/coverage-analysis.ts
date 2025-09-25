/**
 * Honest coverage analysis command that shows what we can actually determine
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TIAEngine } from '@tia-js/core';
import { loadConfig } from '../config';

export const coverageAnalysisCommand = new Command('analysis')
  .description('Show honest analysis of what coverage data tells us')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(async (options) => {
    const spinner = ora('Analyzing coverage data...').start();
    
    try {
      const config = await loadConfig(options.config);
      const engine = new TIAEngine(config);
      
      const nycReader = engine['coverageAnalyzer']['nycReader'];
      
      if (!nycReader.hasNYCCoverage()) {
        spinner.warn('No NYC coverage data found');
        return;
      }
      
      const coveredFiles = await nycReader.readNYCCoverage();
      const stats = await nycReader.getCoverageStats();
      
      spinner.succeed('Coverage analysis complete');
      
      console.log();
      console.log(chalk.bold.blue('📊 Honest Coverage Analysis'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log();
      
      console.log(chalk.bold('What NYC Coverage Tells Us:'));
      console.log(`  Files with coverage: ${chalk.yellow(coveredFiles.length)}`);
      console.log(`  Statement coverage: ${chalk.green(stats.statements)}`);
      console.log(`  Function coverage: ${chalk.green(stats.functions)}`);
      console.log(`  Branch coverage: ${chalk.green(stats.branches)}`);
      console.log();
      
      console.log(chalk.bold('Covered Source Files:'));
      for (const file of coveredFiles) {
        console.log(`  📁 ${file}`);
      }
      console.log();
      
      console.log(chalk.yellow('⚠️  Important Limitations:'));
      console.log('  • NYC coverage is AGGREGATED across all test runs');
      console.log('  • We cannot determine which specific test covered each file');
      console.log('  • Files may be covered due to shared initialization code');
      console.log('  • Changes to any covered file might require running multiple tests');
      console.log();
      
      console.log(chalk.blue('💡 For True Per-Test Mapping:'));
      console.log('  • Run tests individually with separate coverage collection');
      console.log('  • Use per-test coverage instrumentation');
      console.log('  • Consider test isolation strategies');
      
    } catch (error) {
      spinner.fail('Failed to analyze coverage');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
