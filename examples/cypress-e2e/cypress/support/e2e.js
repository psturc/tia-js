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

// Per-test coverage collection for TIA
beforeEach(() => {
  // Reset coverage tracking for each test
  cy.window().then((win) => {
    if (win.__coverage__) {
      // Store reference to previous coverage but reset for this test
      win.__previousCoverage = win.__coverage__;
      win.__coverage__ = {};
    }
  });
});

afterEach(function () {
  // Collect coverage data after each test
  const testName = this.currentTest?.fullTitle() || 'unknown-test';
  const specName = Cypress.spec.relative;
  
  cy.window().then((win) => {
    if (win.__coverage__) {
      cy.task('saveCoveragePerTest', {
        testName,
        specName,
        coverage: win.__coverage__
      }, { log: false });
    }
  });
});

// Custom commands can be added here
Cypress.Commands.add('performCalculation', (num1, operation, num2) => {
  cy.get('[data-cy="num1"]').clear().type(num1);
  cy.get('[data-cy="num2"]').clear().type(num2);
  cy.get('[data-cy="operation"]').select(operation);
  cy.get('[data-cy="calculate"]').click();
});
