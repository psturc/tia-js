// Custom Cypress commands

// Example custom command for calculator operations
Cypress.Commands.add('calculateAndVerify', (num1, operation, num2, expectedResult) => {
  cy.get('[data-cy="num1"]').clear().type(num1);
  cy.get('[data-cy="num2"]').clear().type(num2);
  cy.get('[data-cy="operation"]').select(operation);
  cy.get('[data-cy="calculate"]').click();
  cy.get('[data-cy="result"]').should('contain', expectedResult);
});

// Command to check history contains specific entry
Cypress.Commands.add('verifyHistoryContains', (entry) => {
  cy.get('[data-cy="history-list"]').should('contain', entry);
});

// Command to clear all inputs
Cypress.Commands.add('clearCalculator', () => {
  cy.get('[data-cy="num1"]').clear();
  cy.get('[data-cy="num2"]').clear();
  cy.get('[data-cy="result"]').should('be.empty');
});
