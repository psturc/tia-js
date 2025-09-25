/**
 * Simulate what would happen if both tests ran and collected coverage
 */

import { TIAEngine } from '@tia-js/core';

async function simulateDualCoverage() {
  console.log('🎯 Simulating Coverage Collection from Both Tests...\n');
  
  // Load TIA config and create engine
  const tiaConfig = await import('./tia.config.cjs');
  const engine = new TIAEngine(tiaConfig.default);
  
  console.log('🧮 Simulating calculator.cy.js test run...');
  
  // Calculator test covers: calculator.js, utils.js, and some shared elements
  await engine.storeCoverageData(
    'cypress/e2e/calculator.cy.js',
    ['src/calculator.js', 'src/utils.js'], // Only calculator-specific logic
    'cypress',
    {
      duration: 2800,
      status: 'passed',
      testName: 'Calculator functionality tests'
    }
  );
  
  console.log('✅ Calculator test covers: src/calculator.js, src/utils.js');
  
  console.log('\n🧭 Simulating navigation.cy.js test run...');
  
  // Navigation test covers: app.js, config.js, and UI elements
  await engine.storeCoverageData(
    'cypress/e2e/navigation.cy.js',
    ['src/app.js', 'src/config.js'], // App initialization and config
    'cypress',
    {
      duration: 1500,
      status: 'passed', 
      testName: 'Navigation and app configuration tests'
    }
  );
  
  console.log('✅ Navigation test covers: src/app.js, src/config.js');
  
  // Show the resulting coverage mapping
  const stats = await engine.getCoverageStats();
  console.log('\n📊 Dual Coverage Summary:');
  console.log(`  Total tests: ${stats.totalTests}`);
  console.log(`  Total source files: ${stats.totalSourceFiles}`);
  console.log(`  Average files per test: ${stats.averageFilesPerTest.toFixed(1)}`);
  
  console.log('\n🎯 Now you can test different file changes:');
  console.log('  • Change src/calculator.js → Only calculator.cy.js runs');
  console.log('  • Change src/utils.js → Only calculator.cy.js runs');
  console.log('  • Change src/app.js → Only navigation.cy.js runs');
  console.log('  • Change src/config.js → Only navigation.cy.js runs');
  console.log('  • Change both calculator.js and config.js → Both tests run');
}

simulateDualCoverage().catch(console.error);
