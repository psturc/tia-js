describe('Calculator App', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the calculator page', () => {
    cy.contains('Calculator App');
    cy.get('[data-cy="num1"]').should('be.visible');
    cy.get('[data-cy="num2"]').should('be.visible');
    cy.get('[data-cy="operation"]').should('be.visible');
    cy.get('[data-cy="calculate"]').should('be.visible');
  });

  it('should perform basic addition', () => {
    cy.get('[data-cy="num1"]').type('5');
    cy.get('[data-cy="num2"]').type('3');
    cy.get('[data-cy="operation"]').select('add');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="result"]').should('contain', '8');
  });

  it('should perform basic subtraction', () => {
    cy.get('[data-cy="num1"]').type('10');
    cy.get('[data-cy="num2"]').type('4');
    cy.get('[data-cy="operation"]').select('subtract');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="result"]').should('contain', '6');
  });

  it('should perform basic multiplication', () => {
    cy.get('[data-cy="num1"]').type('6');
    cy.get('[data-cy="num2"]').type('7');
    cy.get('[data-cy="operation"]').select('multiply');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="result"]').should('contain', '42');
  });

  it('should perform basic division', () => {
    cy.get('[data-cy="num1"]').type('15');
    cy.get('[data-cy="num2"]').type('3');
    cy.get('[data-cy="operation"]').select('divide');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="result"]').should('contain', '5');
  });

  it('should handle division by zero', () => {
    cy.get('[data-cy="num1"]').type('10');
    cy.get('[data-cy="num2"]').type('0');
    cy.get('[data-cy="operation"]').select('divide');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="result"]').should('contain', 'Cannot divide by zero');
  });

  it('should validate input fields', () => {
    cy.get('[data-cy="num1"]').type('abc');
    cy.get('[data-cy="num2"]').type('5');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="result"]').should('contain', 'Please enter valid numbers');
  });

  it('should add calculations to history', () => {
    // Perform first calculation
    cy.get('[data-cy="num1"]').type('2');
    cy.get('[data-cy="num2"]').type('3');
    cy.get('[data-cy="operation"]').select('add');
    cy.get('[data-cy="calculate"]').click();
    
    // Check history
    cy.get('[data-cy="history-list"]').should('contain', '2 + 3 = 5');
    
    // Perform second calculation
    cy.get('[data-cy="num1"]').clear().type('8');
    cy.get('[data-cy="num2"]').clear().type('2');
    cy.get('[data-cy="operation"]').select('divide');
    cy.get('[data-cy="calculate"]').click();
    
    // Check both entries in history
    cy.get('[data-cy="history-list"]').should('contain', '8 ÷ 2 = 4');
    cy.get('[data-cy="history-list"]').should('contain', '2 + 3 = 5');
  });

  it('should clear history', () => {
    // Add some calculations to history
    cy.get('[data-cy="num1"]').type('1');
    cy.get('[data-cy="num2"]').type('1');
    cy.get('[data-cy="calculate"]').click();
    
    cy.get('[data-cy="num1"]').clear().type('2');
    cy.get('[data-cy="num2"]').clear().type('2');
    cy.get('[data-cy="calculate"]').click();
    
    // Verify history has entries
    cy.get('[data-cy="history-list"] li').should('have.length', 2);
    
    // Clear history
    cy.get('[data-cy="clear-history"]').click();
    
    // Verify history is empty
    cy.get('[data-cy="history-list"] li').should('have.length', 0);
  });

  it('should calculate using Enter key', () => {
    cy.get('[data-cy="num1"]').type('4');
    cy.get('[data-cy="num2"]').type('5');
    cy.get('[data-cy="operation"]').select('multiply');
    
    // Press Enter to calculate
    cy.get('body').type('{enter}');
    
    cy.get('[data-cy="result"]').should('contain', '20');
  });
});
