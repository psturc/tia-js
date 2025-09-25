# TIA Cypress Example

This example demonstrates how to use Test Impact Analysis with Cypress for E2E testing.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize TIA configuration (optional, already configured):
```bash
npx tia init
```

## Usage

### Start the development server
```bash
npm run dev
```

### Run Cypress tests normally
```bash
# Interactive mode
npm run cy:open

# Headless mode
npm run cy:run

# With server start/stop
npm test
```

### Use TIA to analyze test impact
```bash
npm run tia:analyze
```

### Run only affected tests
```bash
npm run tia:run
```

### Watch mode with TIA
```bash
npm run tia:watch
```

## Example Scenario

1. Make a change to `src/calculator.js`:
```javascript
// Change the addition operation
case 'add':
    result = num1 + num2 + 0.1; // Add small offset
    operationSymbol = '+';
    break;
```

2. Run TIA analysis:
```bash
npm run tia:analyze
```

You should see that `calculator.cy.js` is affected because it tests the calculator functionality.

3. Run affected tests:
```bash
npm run tia:run
```

Only the affected E2E tests will run!

## Project Structure

```
src/
├── index.html           # Main HTML page
├── styles.css          # CSS styles
└── calculator.js       # Calculator JavaScript logic

cypress/
├── e2e/
│   └── calculator.cy.js # E2E tests for calculator
├── support/
│   ├── e2e.js          # Global E2E support
│   └── commands.js     # Custom Cypress commands
└── fixtures/           # Test data files
```

## TIA Configuration

The `tia.config.js` file configures:
- Source file extensions: `.js`, `.html`, `.css`
- Test file extensions: `.cy.js`
- Cypress-specific configuration
- Lower dependency depth for E2E tests

## Benefits for E2E Testing

- **Faster feedback**: Skip E2E tests that aren't affected by changes
- **Resource efficiency**: E2E tests are expensive, run only when needed
- **Smart test selection**: Automatically detect which E2E tests to run
- **CI/CD optimization**: Reduce build times significantly

## Custom Cypress Commands

The example includes custom commands:
- `cy.calculateAndVerify()` - Perform calculation and verify result
- `cy.verifyHistoryContains()` - Check history contains specific entry
- `cy.clearCalculator()` - Clear all calculator inputs

Use these in your tests for more maintainable E2E test code.
