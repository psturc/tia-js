# TIA Jest Example

This example demonstrates how to use Test Impact Analysis with Jest for unit testing.

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

### Run all tests normally
```bash
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

1. Make a change to `src/math.ts`:
```typescript
export function add(a: number, b: number): number {
  console.log(`Adding ${a} + ${b}`); // Add this line
  return a + b;
}
```

2. Run TIA analysis:
```bash
npm run tia:analyze
```

You should see that both `math.test.ts` and `calculator.test.ts` are affected because:
- `math.test.ts` directly imports and tests `math.ts`
- `calculator.test.ts` tests `calculator.ts` which imports `math.ts`

3. Run affected tests:
```bash
npm run tia:run
```

Only the affected tests will run instead of the entire test suite!

## Project Structure

```
src/
├── math.ts              # Math utility functions
├── math.test.ts         # Tests for math utilities
├── calculator.ts        # Calculator class (depends on math.ts)
└── calculator.test.ts   # Tests for calculator class
```

## TIA Configuration

The `tia.config.js` file configures:
- Source file extensions: `.ts`, `.js`
- Test file extensions: `.test.ts`, `.test.js`
- Jest-specific configuration
- Dependency analysis depth and patterns

## Benefits

- **Faster CI/CD**: Only run tests affected by changes
- **Quick feedback**: Get test results faster during development
- **Resource efficient**: Save compute time and resources
- **Smart testing**: Automatically discover test dependencies
