/**
 * Watch command for TIA CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TIAEngine } from '@tia-js/core';
import { CypressAdapter } from '@tia-js/cypress';
import { PlaywrightAdapter } from '@tia-js/playwright';
import { JestAdapter } from '@tia-js/jest';
import { TIAResult, formatDuration } from '@tia-js/common';
import { loadConfig } from '../config';

export const watchCommand = new Command('watch')
  .alias('w')
  .description('Watch for file changes and run affected tests automatically')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-b, --base <commit>', 'Base commit/branch to compare against', 'HEAD')
  .option('--include-unstaged', 'Include unstaged changes', true)
  .option('--include-untracked', 'Include untracked files', false)
  .option('-f, --framework <name>', 'Force specific framework (cypress, playwright, jest)')
  .option('--max-depth <number>', 'Maximum dependency analysis depth', '10')
  .option('--debounce <ms>', 'Debounce time for file changes in milliseconds', '1000')
  .option('--auto-run', 'Automatically run tests without confirmation', false)
  .option('--verbose', 'Verbose output', false)
  .action(async (options) => {
    const spinner = ora('Initializing Test Impact Analysis watch mode...').start();
    
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

      spinner.succeed('Watch mode initialized');
      
      console.log();
      console.log(chalk.bold.blue('👀 Test Impact Analysis - Watch Mode'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(chalk.green('✓ Watching for file changes...'));
      console.log(chalk.gray(`  Base: ${options.base}`));
      console.log(chalk.gray(`  Include unstaged: ${options.includeUnstaged}`));
      console.log(chalk.gray(`  Include untracked: ${options.includeUntracked}`));
      console.log(chalk.gray(`  Auto-run tests: ${options.autoRun}`));
      console.log();
      console.log(chalk.yellow('Press Ctrl+C to stop watching'));
      console.log();

      let isRunning = false;
      let runCount = 0;

      // Start watching
      const stopWatching = await engine.watch(async (result: TIAResult) => {
        if (isRunning) {
          console.log(chalk.yellow('⏳ Analysis already in progress, skipping...'));
          return;
        }

        runCount++;
        isRunning = true;

        try {
          console.log(chalk.blue(`🔄 Change detected (run #${runCount})`));
          console.log(chalk.gray(`   Time: ${new Date().toLocaleTimeString()}`));
          
          // Display summary
          console.log(`   Changed files: ${chalk.yellow(result.changedFiles.length)}`);
          console.log(`   Affected tests: ${chalk.green(result.affectedTests.length)}`);
          console.log(`   Analysis time: ${chalk.cyan(formatDuration(result.metadata.analysisTime))}`);

          if (result.affectedTests.length === 0) {
            console.log(chalk.gray('   No affected tests to run'));
            console.log();
            return;
          }

          // Show affected tests (limited)
          if (options.verbose || result.affectedTests.length <= 5) {
            console.log('   Affected tests:');
            for (const test of result.affectedTests.slice(0, 5)) {
              const relativePath = test.path.replace(process.cwd() + '/', '');
              console.log(`     ${chalk.gray('•')} ${relativePath}`);
            }
            if (result.affectedTests.length > 5) {
              console.log(`     ${chalk.gray(`... and ${result.affectedTests.length - 5} more`)}`);
            }
          }

          if (options.autoRun) {
            console.log(chalk.blue('   🚀 Auto-running tests...'));
            
            try {
              await engine.runTests(result, options.framework);
              console.log(chalk.green('   ✅ All tests passed'));
            } catch (testError) {
              console.log(chalk.red('   ❌ Some tests failed'));
              if (options.verbose && testError instanceof Error) {
                console.log(chalk.red(`   Error: ${testError.message}`));
              }
            }
          } else {
            console.log(chalk.yellow('   💡 Run `tia run` to execute these tests'));
          }

        } catch (error) {
          console.log(chalk.red('   ❌ Analysis failed'));
          if (options.verbose && error instanceof Error) {
            console.log(chalk.red(`   Error: ${error.message}`));
          }
        } finally {
          console.log();
          isRunning = false;
        }
      }, {
        base: options.base,
        includeUnstaged: options.includeUnstaged,
        includeUntracked: options.includeUntracked
      });

      // Handle graceful shutdown
      const cleanup = () => {
        console.log();
        console.log(chalk.yellow('🛑 Stopping watch mode...'));
        stopWatching();
        console.log(chalk.green('✓ Watch mode stopped'));
        console.log(chalk.gray(`Total runs: ${runCount}`));
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Keep the process alive
      await new Promise(() => {}); // This will run indefinitely until interrupted
      
    } catch (error) {
      spinner.fail('Failed to start watch mode');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      
      if (options.verbose && error instanceof Error && error.stack) {
        console.log();
        console.log(chalk.gray('Stack trace:'));
        console.log(error.stack);
      }
      
      process.exit(1);
    }
  });
