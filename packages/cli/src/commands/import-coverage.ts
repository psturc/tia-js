/**
 * Import per-test coverage data collected by test frameworks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { TIAEngine } from '@tia-js/core';
import { loadConfig } from '../config';

export const importCoverageCommand = new Command('import')
  .description('Import per-test coverage data from test framework collection')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--source <path>', 'Source directory for per-test coverage files', '.nyc_output/per-test')
  .option('--clean', 'Clear existing TIA coverage data before import', false)
  .action(async (options) => {
    console.log(chalk.bold.blue('📥 Importing Per-Test Coverage Data'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    
    const spinner = ora('Scanning for per-test coverage files...').start();
    
    try {
      const config = await loadConfig(options.config);
      const engine = new TIAEngine(config);
      
      const sourceDir = path.resolve(config.rootDir, options.source);
      
      if (!fs.existsSync(sourceDir)) {
        spinner.fail(`Per-test coverage directory not found: ${sourceDir}`);
        console.log();
        console.log(chalk.yellow('💡 To collect per-test coverage:'));
        console.log('  1. Run your tests (e.g., "yarn cy:run")');
        console.log('  2. Ensure Cypress support file includes per-test collection hooks');
        console.log('  3. Check that coverage files are saved to .nyc_output/per-test/');
        return;
      }
      
      // Scan for coverage files
      const coverageFiles = fs.readdirSync(sourceDir).filter(file => file.endsWith('.json'));
      
      if (coverageFiles.length === 0) {
        spinner.warn('No per-test coverage files found');
        return;
      }
      
      spinner.text = `Processing ${coverageFiles.length} coverage files...`;
      
      if (options.clean) {
        await engine.clearCoverageData();
        console.log(chalk.blue('🧹 Cleared existing TIA coverage data'));
      }
      
      let importedCount = 0;
      const summary = new Map<string, string[]>();
      
      for (const file of coverageFiles) {
        try {
          const filePath = path.join(sourceDir, file);
          const coverageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          
          // Parse test info from filename
          const [specName, testName] = file.replace('.json', '').split('__', 2);
          
          // Correctly reconstruct the spec file path
          // Format: cypress_e2e_calculator_cy_js -> cypress/e2e/calculator.cy.js
          const normalizedSpecName = specName
            .replace(/_cy_js$/, '.cy.js')  // Handle .cy.js suffix
            .replace(/_test_js$/, '.test.js')  // Handle .test.js suffix  
            .replace(/_spec_js$/, '.spec.js')  // Handle .spec.js suffix
            .replace(/_js$/, '.js')  // Handle regular .js suffix
            .replace(/_/g, '/');  // Convert remaining underscores to slashes
            
          const readableTestName = testName?.replace(/_/g, ' ') || 'unknown';
          
          // Create unique test identifier that includes both file and test name
          const uniqueTestId = `${normalizedSpecName}::${readableTestName}`;
          
          // Extract covered source files
          const executedFiles: string[] = [];
          
          for (const [filePath, coverage] of Object.entries(coverageData)) {
            if (isSourceFile(filePath) && hasExecutedStatements(coverage as any)) {
              const relativePath = path.relative(config.rootDir, filePath);
              executedFiles.push(relativePath);
            }
          }
          
          if (executedFiles.length > 0) {
            // Store in TIA format with unique test identifier
            await engine.storeCoverageData(
              uniqueTestId,
              executedFiles,
              'cypress',
              {
                status: 'passed',
                testName: readableTestName,
                specFile: normalizedSpecName
              }
            );
            
            summary.set(uniqueTestId, executedFiles);
            importedCount++;
          }
          
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
      
      spinner.succeed(`Successfully imported ${importedCount} per-test coverage records`);
      
      console.log();
      console.log(chalk.bold.green('📊 Import Summary:'));
      console.log();
      
      for (const [uniqueTestId, coveredFiles] of summary) {
        const [specFile, testName] = uniqueTestId.split('::', 2);
        console.log(chalk.cyan(`🧪 ${testName}`));
        console.log(chalk.gray(`   in ${specFile}`));
        console.log(`   Covered files: ${chalk.yellow(coveredFiles.length)}`);
        coveredFiles.slice(0, 3).forEach(file => {
          console.log(`     📁 ${file}`);
        });
        if (coveredFiles.length > 3) {
          console.log(`     ... and ${coveredFiles.length - 3} more`);
        }
        console.log();
      }
      
      console.log(chalk.bold.blue('🎯 Next Steps:'));
      console.log('  • Run "tia coverage mapping" to see precise test-to-source relationships');
      console.log('  • Run "tia analyze --use-coverage" for accurate impact analysis');
      console.log('  • Per-test data is now available in .tia/coverage.json');
      
    } catch (error) {
      spinner.fail('Failed to import coverage data');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Check if a file is a source file we should track
 */
function isSourceFile(filePath: string): boolean {
  return filePath.includes('/src/') && 
         filePath.endsWith('.js') &&
         !filePath.includes('node_modules') &&
         !filePath.includes('/test/') &&
         !filePath.includes('.test.') &&
         !filePath.includes('.spec.');
}

/**
 * Check if coverage data shows executed statements
 */
function hasExecutedStatements(coverage: any): boolean {
  for (const statementId in coverage.s || {}) {
    if (coverage.s[statementId] > 0) {
      return true;
    }
  }
  return false;
}
