# TIA.js Cypress Example - Production Workflow

This example demonstrates **Test Impact Analysis** for a React application with **surgical line-level precision**.

## 🎯 What This Demonstrates

- **Line-level TIA**: Identifies which tests cover specific changed lines
- **Perfect separation**: Navigation tests vs. Dynamic content tests
- **PR workflow**: Ready for CI/CD integration
- **Dynamic imports**: True module separation for accurate coverage

## 🏗️ Architecture

```
src/
├── App.jsx              # Main component (covered by both test suites)
├── DynamicContent.jsx   # Only loaded when button clicked (dynamic import)
├── utils.js             # Only used by dynamic content
└── index.jsx            # React entry point

cypress/e2e/
├── main-page.cy.js      # Tests main page only (no dynamic content)
└── dynamic-content.cy.js # Tests button click + dynamic content

.tia/
└── per-test-coverage/   # Per-test coverage data (synced from server)
```

## 🚀 Usage

### Development Workflow
```bash
# Make changes to source files
echo "// New feature" >> src/utils.js

# See detailed impact analysis
yarn tia:line-analysis

# Get affected tests for CI/CD
yarn tia:affected-tests
```

### CI/CD Integration
```bash
# In your CI pipeline:
AFFECTED_TESTS=$(tia affected-tests --format specs)
if [ -n "$AFFECTED_TESTS" ]; then
  cypress run --spec "$AFFECTED_TESTS"
else
  echo "No tests affected - skipping test execution"
fi
```

## 📊 Example Results

**Change to `src/utils.js`:**
```
Summary:
  Total changed lines: 1
  Coverage percentage: 100.0%
  Affected tests: 1

Result: Only dynamic-content.cy.js runs
```

**Change to `src/App.jsx`:**
```
Summary:
  Total changed lines: 1  
  Coverage percentage: 100.0%
  Affected tests: 2

Result: Both main-page.cy.js and dynamic-content.cy.js run
```

## 🔧 Setup Requirements

### 1. Coverage Data Collection
Coverage data must be available in `.tia/per-test-coverage/`. In production:

1. **Periodic job** runs all tests against main branch
2. **Collects per-test coverage** using Cypress hooks
3. **Uploads to TIA server** (S3, database, etc.)
4. **PR pipeline syncs** data to `.tia/per-test-coverage/`

### 2. Webpack Configuration
- **Build-time instrumentation** with babel-plugin-istanbul
- **Dynamic imports** for true module separation  
- **Source maps** for accurate line mapping

### 3. Cypress Integration
- **Per-test coverage collection** in `cypress/support/e2e.js`
- **Coverage tasks** in `cypress.config.js`
- **Separate test files** for different app areas

## ⚡ Performance Benefits

- **Faster CI/CD**: Run only affected tests instead of entire suite
- **Surgical precision**: Line-level granularity eliminates false positives
- **Resource optimization**: Reduce compute costs and feedback time
- **Developer experience**: Instant feedback on test impact

## 🧪 Demo Workflow

Run `./demo-ci-workflow.sh` to see the complete TIA workflow in action!

---

**Next Steps**: 
1. Set up TIA server for coverage data management
2. Integrate into your CI/CD pipeline  
3. Enjoy faster, more precise test execution! 🚀