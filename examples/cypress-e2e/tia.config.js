/**
 * Test Impact Analysis Configuration for Cypress Example
 */

module.exports = {
  rootDir: __dirname,
  sourceExtensions: ['.js', '.html', '.css'],
  testExtensions: ['.cy.js'],
  ignorePatterns: [
    'node_modules/**',
    'cypress/downloads/**',
    'cypress/screenshots/**',
    'cypress/videos/**'
  ],
  maxDepth: 5,
  includeIndirect: true,
  frameworks: {
    cypress: {
      configFile: 'cypress.config.js',
      specPattern: 'cypress/e2e/**/*.cy.js'
    }
  }
};
