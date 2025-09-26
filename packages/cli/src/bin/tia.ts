#!/usr/bin/env node

/**
 * TIA CLI Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from '../commands/analyze';
import { runCommand } from '../commands/run';
import { watchCommand } from '../commands/watch';
import { initCommand } from '../commands/init';
import { coverageCommand } from '../commands/coverage';
import { lineAnalysisCommand } from '../commands/line-analysis';

const program = new Command();

program
  .name('tia')
  .description('Universal Test Impact Analysis CLI')
  .version('1.0.0')
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
  });

// Add commands
program.addCommand(initCommand);
program.addCommand(analyzeCommand);
program.addCommand(runCommand);
program.addCommand(watchCommand);
program.addCommand(coverageCommand);
program.addCommand(lineAnalysisCommand);

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

// Custom help
program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(str),
  outputError: (str, write) => {
    write(chalk.red(str));
  }
});

// Enhanced help
program.addHelpText('before', chalk.bold.blue(`
╔══════════════════════════════════════╗
║     Test Impact Analysis (TIA)       ║
║   Universal Testing Framework CLI    ║
╚══════════════════════════════════════╝
`));

program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} tia init                    ${chalk.gray('# Initialize TIA configuration')}
  ${chalk.gray('$')} tia analyze                ${chalk.gray('# Analyze test impact')}
  ${chalk.gray('$')} tia run                    ${chalk.gray('# Run affected tests')}
  ${chalk.gray('$')} tia watch                  ${chalk.gray('# Watch for changes and run tests')}
  ${chalk.gray('$')} tia analyze --base main    ${chalk.gray('# Compare against main branch')}
  ${chalk.gray('$')} tia run --framework jest   ${chalk.gray('# Force Jest framework')}

${chalk.bold('Framework Support:')}
  • Jest (Unit/Integration tests)
  • Cypress (E2E tests)  
  • Playwright (E2E tests)

${chalk.bold('Documentation:')}
  Visit ${chalk.cyan('https://github.com/your-org/tia-js')} for more information.
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
