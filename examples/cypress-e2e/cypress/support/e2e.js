// Cypress E2E support file

// Import commands.js using ES2015 syntax:
import './commands';

// Import code coverage support
import '@cypress/code-coverage/support';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  return false;
});

// TIA Coverage collection
let testStartTime;
let currentTestFile;

beforeEach(() => {
  testStartTime = Date.now();
  currentTestFile = Cypress.spec.relative;
});

afterEach(() => {
  // Collect coverage data after each test
  if (window.__coverage__) {
    const executedFiles = Object.keys(window.__coverage__)
      .filter(file => {
        // Filter to only source files (not test files or node_modules)
        return !file.includes('node_modules') && 
               !file.includes('cypress') &&
               !file.endsWith('.cy.js') &&
               !file.endsWith('.spec.js');
      })
      .map(file => {
        // Convert to relative path from project root
        if (file.includes('/src/')) {
          return file.substring(file.indexOf('/src/') + 1);
        }
        return file;
      });

    const metadata = {
      duration: Date.now() - testStartTime,
      status: 'passed', // Will be overridden if test fails
      testName: Cypress.currentTest?.title || 'unknown'
    };

    // Store coverage data
    cy.task('tia:storeCoverage', {
      testFile: currentTestFile,
      executedFiles,
      metadata
    }, { log: false });
  }
});

// Update status on test failure
Cypress.on('test:after:run', (test) => {
  if (test.state === 'failed' && window.__coverage__) {
    const executedFiles = Object.keys(window.__coverage__)
      .filter(file => {
        return !file.includes('node_modules') && 
               !file.includes('cypress') &&
               !file.endsWith('.cy.js') &&
               !file.endsWith('.spec.js');
      })
      .map(file => {
        if (file.includes('/src/')) {
          return file.substring(file.indexOf('/src/') + 1);
        }
        return file;
      });

    const metadata = {
      duration: Date.now() - testStartTime,
      status: 'failed',
      testName: test.title,
      error: test.err?.message
    };

    cy.task('tia:storeCoverage', {
      testFile: currentTestFile,
      executedFiles,
      metadata
    }, { log: false });
  }
});

// Custom commands can be added here
Cypress.Commands.add('performCalculation', (num1, operation, num2) => {
  cy.get('[data-cy="num1"]').clear().type(num1);
  cy.get('[data-cy="num2"]').clear().type(num2);
  cy.get('[data-cy="operation"]').select(operation);
  cy.get('[data-cy="calculate"]').click();
});
