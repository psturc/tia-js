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

// Note: TIA now reads coverage data directly from .nyc_output/out.json
// The @cypress/code-coverage plugin above handles all coverage collection automatically

// Custom commands can be added here
Cypress.Commands.add('performCalculation', (num1, operation, num2) => {
  cy.get('[data-cy="num1"]').clear().type(num1);
  cy.get('[data-cy="num2"]').clear().type(num2);
  cy.get('[data-cy="operation"]').select(operation);
  cy.get('[data-cy="calculate"]').click();
});
