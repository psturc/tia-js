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
  cy.window().then((win) => {
    if (win.__coverage__) {
      const executedFiles = Object.keys(win.__coverage__)
        .filter(file => {
          // Filter to only source files (not test files, node_modules, or webpack runtime)
          return !file.includes('node_modules') && 
                 !file.includes('cypress') &&
                 !file.includes('webpack') &&
                 !file.endsWith('.cy.js') &&
                 !file.endsWith('.spec.js') &&
                 file.includes('/src/'); // Only include actual source files
        })
        .map(file => {
          // Convert to relative path from project root
          // Extract just the src/ relative path
          const srcIndex = file.indexOf('/src/');
          if (srcIndex !== -1) {
            return file.substring(srcIndex + 1);
          }
          // Fallback: if it's already a relative path starting with src/
          if (file.startsWith('src/')) {
            return file;
          }
          return file;
        });

      const metadata = {
        duration: Date.now() - testStartTime,
        status: 'passed', // Will be overridden if test fails
        testName: Cypress.currentTest?.title || 'unknown',
        coverageEntries: Object.keys(win.__coverage__).length
      };

      // Only store if we found some source files
      if (executedFiles.length > 0) {
        cy.task('tia:storeCoverage', {
          testFile: currentTestFile,
          executedFiles,
          metadata
        }, { log: false });
      }
    }
  });
});

// Update status on test failure  
Cypress.on('test:after:run', (test) => {
  if (test.state === 'failed') {
    cy.window().then((win) => {
      if (win.__coverage__) {
        const executedFiles = Object.keys(win.__coverage__)
          .filter(file => {
            return !file.includes('node_modules') && 
                   !file.includes('cypress') &&
                   !file.includes('webpack') &&
                   !file.endsWith('.cy.js') &&
                   !file.endsWith('.spec.js') &&
                   file.includes('/src/');
          })
          .map(file => {
            const srcIndex = file.indexOf('/src/');
            if (srcIndex !== -1) {
              return file.substring(srcIndex + 1);
            }
            if (file.startsWith('src/')) {
              return file;
            }
            return file;
          });

        const metadata = {
          duration: Date.now() - testStartTime,
          status: 'failed',
          testName: test.title,
          error: test.err?.message,
          coverageEntries: Object.keys(win.__coverage__).length
        };

        if (executedFiles.length > 0) {
          cy.task('tia:storeCoverage', {
            testFile: currentTestFile,
            executedFiles,
            metadata
          }, { log: false });
        }
      }
    });
  }
});

// Custom commands can be added here
Cypress.Commands.add('performCalculation', (num1, operation, num2) => {
  cy.get('[data-cy="num1"]').clear().type(num1);
  cy.get('[data-cy="num2"]').clear().type(num2);
  cy.get('[data-cy="operation"]').select(operation);
  cy.get('[data-cy="calculate"]').click();
});
