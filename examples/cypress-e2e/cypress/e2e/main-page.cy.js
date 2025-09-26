describe('Main Page Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the main page', () => {
    cy.get('[data-cy="page-title"]').should('contain', 'TIA Demo App');
    cy.get('[data-cy="page-description"]').should('be.visible');
    cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome!');
  });

  it('should display the load button', () => {
    cy.get('[data-cy="load-dynamic-btn"]').should('be.visible');
    cy.get('[data-cy="load-dynamic-btn"]').should('contain', 'Load Dynamic Content');
  });

  it('should show app version', () => {
    cy.get('[data-cy="app-version"]').should('contain', 'TIA Demo v1.0.0');
  });

  // This test ONLY covers the main page - should NOT cover DynamicContent.jsx or utils.js
});
