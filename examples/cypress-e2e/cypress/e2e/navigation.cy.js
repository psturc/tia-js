describe('Navigation Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the main page', () => {
    cy.contains('Calculator App');
    cy.get('h1').should('be.visible');
  });

  it('should have proper page title', () => {
    cy.title().should('eq', 'TIA Cypress Example');
  });

  it('should display the calculator form', () => {
    cy.get('[data-cy="num1"]').should('be.visible');
    cy.get('[data-cy="num2"]').should('be.visible');
    cy.get('[data-cy="operation"]').should('be.visible');
    cy.get('[data-cy="calculate"]').should('be.visible');
  });
});
