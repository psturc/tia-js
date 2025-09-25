/**
 * Init command for TIA CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as path from 'path';
import { promises as fs } from 'fs';
import { fileExists } from '@tia-js/common';

export const initCommand = new Command('init')
  .description('Initialize TIA configuration in the current project')
  .option('-f, --force', 'Overwrite existing configuration', false)
  .option('--config-file <name>', 'Configuration file name', 'tia.config.js')
  .action(async (options) => {
    console.log();
    console.log(chalk.bold.blue('🚀 Initialize Test Impact Analysis'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();

    const configPath = path.join(process.cwd(), options.configFile);
    
    // Check if config already exists
    if (!options.force && await fileExists(configPath)) {
      console.log(chalk.yellow('⚠️  Configuration file already exists'));
      console.log(chalk.gray(`   File: ${configPath}`));
      
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite the existing configuration?',
          default: false
        }
      ]);

      if (!overwrite) {
        console.log(chalk.yellow('Configuration initialization cancelled'));
        process.exit(0);
      }
    }

    try {
      // Gather configuration information
      console.log(chalk.bold('Project Configuration:'));
      console.log();

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'rootDir',
          message: 'Project root directory:',
          default: process.cwd()
        },
        {
          type: 'checkbox',
          name: 'frameworks',
          message: 'Which testing frameworks do you use?',
          choices: [
            { name: 'Jest', value: 'jest' },
            { name: 'Cypress', value: 'cypress' },
            { name: 'Playwright', value: 'playwright' }
          ]
        },
        {
          type: 'input',
          name: 'sourceExtensions',
          message: 'Source file extensions (comma-separated):',
          default: '.ts,.tsx,.js,.jsx,.mjs,.cjs'
        },
        {
          type: 'input',
          name: 'testExtensions',
          message: 'Test file extensions (comma-separated):',
          default: '.test.ts,.test.tsx,.test.js,.test.jsx,.spec.ts,.spec.tsx,.spec.js,.spec.jsx'
        },
        {
          type: 'input',
          name: 'ignorePatterns',
          message: 'Ignore patterns (comma-separated):',
          default: 'node_modules/**,dist/**,build/**,coverage/**,.git/**'
        },
        {
          type: 'number',
          name: 'maxDepth',
          message: 'Maximum dependency analysis depth:',
          default: 10
        },
        {
          type: 'confirm',
          name: 'includeIndirect',
          message: 'Include indirect dependencies?',
          default: true
        }
      ]);

      // Framework-specific configuration
      const frameworkConfigs: any = {};
      
      if (answers.frameworks.includes('cypress')) {
        console.log();
        console.log(chalk.bold('Cypress Configuration:'));
        
        const cypressAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'configFile',
            message: 'Cypress config file path:',
            default: 'cypress.config.js'
          },
          {
            type: 'input',
            name: 'specPattern',
            message: 'Cypress spec pattern:',
            default: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'
          }
        ]);
        
        frameworkConfigs.cypress = {
          configFile: cypressAnswers.configFile || undefined,
          specPattern: cypressAnswers.specPattern || undefined
        };
      }

      if (answers.frameworks.includes('playwright')) {
        console.log();
        console.log(chalk.bold('Playwright Configuration:'));
        
        const playwrightAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'configFile',
            message: 'Playwright config file path:',
            default: 'playwright.config.js'
          },
          {
            type: 'input',
            name: 'testDir',
            message: 'Playwright test directory:',
            default: 'tests'
          }
        ]);
        
        frameworkConfigs.playwright = {
          configFile: playwrightAnswers.configFile || undefined,
          testDir: playwrightAnswers.testDir || undefined
        };
      }

      if (answers.frameworks.includes('jest')) {
        console.log();
        console.log(chalk.bold('Jest Configuration:'));
        
        const jestAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'configFile',
            message: 'Jest config file path:',
            default: 'jest.config.js'
          }
        ]);
        
        frameworkConfigs.jest = {
          configFile: jestAnswers.configFile || undefined
        };
      }

      // Generate configuration
      const config = {
        rootDir: answers.rootDir,
        sourceExtensions: answers.sourceExtensions.split(',').map((s: string) => s.trim()),
        testExtensions: answers.testExtensions.split(',').map((s: string) => s.trim()),
        ignorePatterns: answers.ignorePatterns.split(',').map((s: string) => s.trim()),
        maxDepth: answers.maxDepth,
        includeIndirect: answers.includeIndirect,
        frameworks: Object.keys(frameworkConfigs).length > 0 ? frameworkConfigs : undefined
      };

      // Generate config file content
      const configContent = generateConfigFile(config);
      
      // Write config file
      await fs.writeFile(configPath, configContent, 'utf-8');
      
      console.log();
      console.log(chalk.green('✅ Configuration created successfully!'));
      console.log(chalk.gray(`   File: ${configPath}`));
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(chalk.gray('  1. Review and adjust the configuration if needed'));
      console.log(chalk.gray('  2. Run `tia analyze` to analyze your project'));
      console.log(chalk.gray('  3. Run `tia run` to execute affected tests'));
      console.log();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to create configuration:'), error);
      process.exit(1);
    }
  });

function generateConfigFile(config: any): string {
  return `/**
 * Test Impact Analysis Configuration
 * Generated by @tia-js/cli
 */

module.exports = ${JSON.stringify(config, null, 2)};
`;
}
