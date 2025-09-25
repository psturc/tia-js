/**
 * Simulate Cypress coverage collection with webpack-instrumented code
 */

import { TIAEngine } from '@tia-js/core';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function simulateCypressCoverage() {
  console.log('🧪 Simulating Cypress E2E tests with webpack coverage...\n');
  
  // Load TIA config
  const tiaConfig = await import('./tia.config.cjs');
  const engine = new TIAEngine(tiaConfig.default);
  
  // Read the instrumented files
  const jsPath = path.join(__dirname, 'dist', 'calculator.js');
  const htmlPath = path.join(__dirname, 'dist', 'index.html');
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Simulate calculator test
  console.log('🧮 Running calculator.cy.js simulation...');
  
  const calculatorDom = new JSDOM(htmlContent, {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.__coverage__ = {};
    }
  });
  
  // Execute instrumented JS
  const calculatorScript = calculatorDom.window.document.createElement('script');
  calculatorScript.textContent = jsContent;
  calculatorDom.window.document.head.appendChild(calculatorScript);
  
  // Simulate calculator test interactions
  const calculator = calculatorDom.window.calculator;
  if (calculator) {
    calculator.add(5, 3);
    calculator.subtract(10, 4);
    calculator.multiply(3, 7);
    calculator.divide(15, 3);
  }
  
  // Extract coverage and store
  const calculatorCoverage = Object.keys(calculatorDom.window.__coverage__)
    .filter(file => file.includes('/src/'))
    .map(file => {
      const srcIndex = file.indexOf('/src/');
      return srcIndex !== -1 ? file.substring(srcIndex + 1) : file;
    });
  
  await engine.storeCoverageData(
    'cypress/e2e/calculator.cy.js',
    calculatorCoverage,
    'cypress',
    {
      duration: 2800,
      status: 'passed',
      testName: 'Calculator Tests - Webpack Instrumented'
    }
  );
  
  console.log(`✅ Calculator test covered: ${calculatorCoverage.join(', ')}`);
  
  // Simulate navigation test (only touches HTML and CSS)
  console.log('🧭 Running navigation.cy.js simulation...');
  
  const navigationDom = new JSDOM(htmlContent, {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.__coverage__ = {};
    }
  });
  
  // For navigation test, we mainly interact with DOM/CSS, not calculator functions
  // So we expect minimal or no JS coverage
  const navigationCoverage = ['src/index.html', 'src/styles.css'];
  
  await engine.storeCoverageData(
    'cypress/e2e/navigation.cy.js',
    navigationCoverage,
    'cypress',
    {
      duration: 1500,
      status: 'passed',
      testName: 'Navigation Tests - Webpack Instrumented'
    }
  );
  
  console.log(`✅ Navigation test covered: ${navigationCoverage.join(', ')}`);
  
  // Show coverage stats
  const stats = await engine.getCoverageStats();
  console.log('\n📈 Coverage Statistics:');
  console.log(`  Tests: ${stats.totalTests}`);
  console.log(`  Source files: ${stats.totalSourceFiles}`);
  console.log(`  Avg files per test: ${stats.averageFilesPerTest.toFixed(1)}`);
  
  console.log('\n🎯 Webpack-based coverage collection completed!');
}

simulateCypressCoverage().catch(console.error);
