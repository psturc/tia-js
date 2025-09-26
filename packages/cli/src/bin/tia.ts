#!/usr/bin/env node

/**
 * TIA CLI Entry Point - Streamlined for PR Workflow
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { lineAnalysisCommand } from '../commands/line-analysis';
import { affectedTestsCommand } from '../commands/affected-tests';

const program = new Command();

program
  .name('tia')
  .description('Test Impact Analysis CLI - Identify affected tests for PR workflows')
  .version('1.0.0');

// Add core commands for PR workflow
program.addCommand(lineAnalysisCommand);
program.addCommand(affectedTestsCommand);

// Add global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-color', 'Disable colored output');

// Handle global options
program.hook('preAction', (thisCommand) => {
  if (thisCommand.opts().noColor) {
    chalk.level = 0;
  }
});

// Enhanced help
program.addHelpText('before', chalk.bold.blue(`
╔══════════════════════════════════════╗
║     Test Impact Analysis (TIA)       ║
║      Streamlined PR Workflow         ║
╚══════════════════════════════════════╝
`));

program.addHelpText('after', `
${chalk.bold('PR Workflow Commands:')}
  ${chalk.gray('$')} tia line-analysis           ${chalk.gray('# Detailed analysis for developers')}
  ${chalk.gray('$')} tia affected-tests          ${chalk.gray('# List affected tests for CI/CD')}
  ${chalk.gray('$')} tia affected-tests --format specs ${chalk.gray('# Just test file names')}

${chalk.bold('Prerequisites:')}
  • Coverage data synced to ${chalk.cyan('.tia/per-test-coverage/')} directory
  • Git repository with committed baseline

${chalk.bold('CI/CD Integration:')}
  ${chalk.gray('AFFECTED_TESTS=$(tia affected-tests --format specs)')}
  ${chalk.gray('cypress run --spec "$AFFECTED_TESTS"')}
`);

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === 'commander.help') {
    process.exit(0);
  } else if (err.code === 'commander.version') {
    process.exit(0);
  } else {
    console.error(chalk.red('Error:'), err.message);
    process.exit(1);
  }
}

// If no command provided, show help
if (process.argv.length <= 2) {
  program.help();
}