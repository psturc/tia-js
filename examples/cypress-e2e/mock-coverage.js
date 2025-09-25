/**
 * Mock coverage data creation for demonstration
 */

const path = require('path');
const { TIAEngine } = require('@tia-js/core');

async function createMockCoverageData() {
  try {
    // Load TIA config
    const tiaConfig = require('./tia.config.js');
    const engine = new TIAEngine(tiaConfig);
    
    console.log('📊 Creating mock coverage data...');
    
    // Simulate calculator test covering calculator.js and index.html
    await engine.storeCoverageData(
      'cypress/e2e/calculator.cy.js',
      ['src/calculator.js', 'src/index.html'],
      'cypress',
      {
        duration: 2500,
        status: 'passed',
        testName: 'Calculator Tests'
      }
    );
    
    // Simulate navigation test covering only index.html and styles.css
    await engine.storeCoverageData(
      'cypress/e2e/navigation.cy.js', 
      ['src/index.html', 'src/styles.css'],
      'cypress',
      {
        duration: 1200,
        status: 'passed',
        testName: 'Navigation Tests'
      }
    );
    
    console.log('✅ Mock coverage data created successfully!');
    
    // Show coverage stats
    const stats = await engine.getCoverageStats();
    console.log('\n📈 Coverage Statistics:');
    console.log(`  Tests: ${stats.totalTests}`);
    console.log(`  Source files: ${stats.totalSourceFiles}`);
    console.log(`  Avg files per test: ${stats.averageFilesPerTest.toFixed(1)}`);
    
  } catch (error) {
    console.error('❌ Failed to create coverage data:', error.message);
  }
}

createMockCoverageData();
