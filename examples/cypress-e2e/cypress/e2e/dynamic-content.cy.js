describe('Dynamic Content Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load dynamic content when button is clicked', () => {
    // First verify main page loads
    cy.get('[data-cy="page-title"]').should('contain', 'TIA Demo App');
    
    // Dynamic content should not be visible initially
    cy.get('[data-cy="dynamic-section"]').should('not.exist');
    
    // Click the button to load dynamic content
    cy.get('[data-cy="load-dynamic-btn"]').click();
    
    // Verify dynamic content is now visible
    cy.get('[data-cy="dynamic-section"]').should('be.visible');
    cy.get('[data-cy="dynamic-title"]').should('contain', 'Dynamic Content Loaded!');
    cy.get('[data-cy="dynamic-message"]').should('be.visible');
  });

  it('should process and display data correctly', () => {
    // Click button to load dynamic content
    cy.get('[data-cy="load-dynamic-btn"]').click();
    
    // Check that data processing works (this should cover utils.js)
    cy.get('[data-cy="processed-data"]').should('be.visible');
    cy.get('[data-cy="processed-data"]').should('contain', 'Processed Result:');
    
    // Check timestamp is displayed
    cy.get('[data-cy="timestamp"]').should('contain', 'Loaded at:');
  });

  // This test covers: App.jsx, DynamicContent.jsx, AND utils.js
});
