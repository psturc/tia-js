describe('Navigation and App Tests', () => {
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

  it('should display app version and status', () => {
    // Check that version is displayed
    cy.get('[data-cy="app-version"]')
      .should('be.visible')
      .should('contain', 'v1.0.2');

    // Check that debug status is displayed
    cy.get('[data-cy="debug-status"]')
      .should('be.visible')
      .should('contain', '[PRODUCTION]');
  });

  it('should toggle debug mode via app manager', () => {
    // Access the app manager and toggle debug mode
    cy.window().then((win) => {
      // Verify app manager exists
      expect(win.appManager).to.exist;
      
      // Get initial debug status
      const initialDebug = win.appManager.isDebugMode();
      
      // Toggle debug mode
      const newDebug = win.appManager.toggleDebugMode();
      expect(newDebug).to.equal(!initialDebug);
      
      // Verify the UI updated
      if (newDebug) {
        cy.get('[data-cy="debug-status"]').should('contain', '[DEBUG MODE]');
      } else {
        cy.get('[data-cy="debug-status"]').should('contain', '[PRODUCTION]');
      }
    });
  });

  it('should have valid API URL from config', () => {
    cy.window().then((win) => {
      expect(win.appManager).to.exist;
      const apiUrl = win.appManager.getApiUrl();
      expect(apiUrl).to.be.a('string');
      expect(apiUrl).to.include('http');
    });
  });
});
