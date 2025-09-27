# TIA.js - Test Impact Analysis

**Streamlined Test Impact Analysis for PR Workflows**

TIA.js identifies exactly which tests need to run based on code changes, providing surgical precision for CI/CD optimization.

## 🚀 Quick Start

### Installation

```bash
npm install -g @tia-js/cli
# or
yarn global add @tia-js/cli
```

### PR Workflow

```bash
# 1. Detailed analysis for developers
tia line-analysis

# 2. Get affected tests for CI/CD
AFFECTED_TESTS=$(tia affected-tests --format specs)
cypress run --spec "$AFFECTED_TESTS"
```

## 📋 Commands

### `tia line-analysis`
Provides detailed line-level analysis showing:
- Which specific lines changed
- Which tests cover those exact lines  
- Coverage percentage of changed lines
- Uncovered lines that need testing

**Example output:**
```
📊 Line-Level Coverage Results
Summary:
  Total changed lines: 1
  Covered changed lines: 1  
  Coverage percentage: 100.0%
  Affected tests: 2

Tests Covering Changed Lines:
┌─────────────────────────────────────────────────────────────────────┐
│ Test Name → Covered Lines → Coverage %                           │
├─────────────────────────────────────────────────────────────────────┤
│ Dynamic Content Tests should load... 100.0% │
│   cypress/e2e/dynamic/content.cy.js             │
│   Lines: 17                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### `tia affected-tests`
Outputs affected tests for CI/CD integration:

```bash
# Get full test identifiers (includes individual test names)
tia affected-tests
# Output: cypress/e2e/dynamic/content.cy.js::Dynamic Content Tests should load...

# Get just test file names (for framework runners)
tia affected-tests --format specs  
# Output: cypress/e2e/dynamic/content.cy.js

# Detailed output for debugging
tia affected-tests --format detailed
```

## 🔧 Prerequisites

### Coverage Data
TIA requires per-test coverage data in `.tia/per-test-coverage/`:

```
.tia/
└── per-test-coverage/
    ├── test_file_1__test_name_1.json
    ├── test_file_2__test_name_2.json
    └── ...
```

**Production Setup:**
1. Set up periodic job to run all tests against main branch
2. Collect per-test coverage data  
3. Upload to TIA server
4. Sync to `.tia/per-test-coverage/` before PR analysis

### Supported Languages & Frameworks

#### JavaScript/TypeScript
- **Frameworks**: Jest, Cypress, Playwright
- **Coverage**: NYC/Istanbul format
- **Test Patterns**: `*.test.js`, `*.spec.js`, `*.cy.js`

#### Go
- **Frameworks**: Ginkgo, standard Go testing
- **Coverage**: Go coverage profiles converted to TIA format
- **Test Patterns**: `*_test.go`

#### Python
- **Frameworks**: pytest
- **Coverage**: coverage.py converted to TIA format
- **Test Patterns**: `test_*.py`, `*_test.py`

### Git Repository
- Committed baseline (for change detection)
- Source files in appropriate directories (`src/` for JS/TS, root for Go/Python)

## 🎯 How It Works

1. **Change Detection**: Uses `git diff` to identify modified lines
2. **Coverage Mapping**: Maps changed lines to test coverage data
3. **Impact Analysis**: Identifies which tests cover the specific changed lines
4. **Surgical Precision**: Only runs tests that actually cover your changes

## 🏗️ CI/CD Integration

### GitHub Actions Example
```yaml
- name: Get affected tests
  id: tia
  run: |
    # Sync coverage data from TIA server
    aws s3 sync s3://your-tia-bucket/.tia .tia/
    
    # Get affected tests
    AFFECTED_TESTS=$(tia affected-tests --format specs)
    echo "affected-tests=$AFFECTED_TESTS" >> $GITHUB_OUTPUT

- name: Run affected tests
  if: steps.tia.outputs.affected-tests != ''
  run: cypress run --spec "${{ steps.tia.outputs.affected-tests }}"
```

### Jenkins Pipeline Example
```groovy
pipeline {
  stages {
    stage('TIA Analysis') {
      steps {
        // Sync coverage data
        sh 'curl -o .tia.tar.gz https://your-tia-server/latest-coverage'
        sh 'tar -xzf .tia.tar.gz'
        
        // Get affected tests
        script {
          env.AFFECTED_TESTS = sh(
            script: 'tia affected-tests --format specs',
            returnStdout: true
          ).trim()
        }
      }
    }
    stage('Run Tests') {
      when { expression { env.AFFECTED_TESTS != '' } }
      steps {
        sh "cypress run --spec '${env.AFFECTED_TESTS}'"
      }
    }
  }
}
```

## 🧪 Framework Support

Currently supports:
- **Cypress** (E2E tests with webpack/babel instrumentation)
- **Jest** (Unit tests - coming soon)
- **Playwright** (E2E tests - coming soon)

## 📁 Directory Structure

```
your-project/
├── .tia/
│   ├── per-test-coverage/          # Synced from TIA server
│   └── coverage.json               # TIA storage (auto-generated)
├── src/                           # Source files to analyze
├── cypress/e2e/                  # Test files
└── package.json
```

## ⚡ Performance

- **Fast**: Only analyzes changed lines (not entire codebase)
- **Precise**: Line-level granularity eliminates false positives
- **Scalable**: Works with large codebases and test suites
- **Lightweight**: Minimal dependencies and fast startup

## 🔍 Troubleshooting

### No coverage data found
```
ERROR: No coverage data found in .tia/per-test-coverage/
```
**Solution**: Sync coverage data from your TIA server before running analysis.

### No affected tests
```
# Empty output from tia affected-tests
```
**Causes**: 
- No tests cover the changed lines
- Coverage data is outdated
- Changes are in comments/non-executable code

### Line analysis shows 0 changes
**Solution**: Ensure you have committed your baseline and made changes to source files in appropriate directories.

## 📚 Examples

TIA.js includes complete example applications for each supported language:

### JavaScript/TypeScript Examples
- **`examples/basic-jest/`** - Jest unit tests with TIA integration
- **`examples/cypress-e2e/`** - Cypress E2E tests with per-test coverage collection

### Go Examples
- **`examples/go-backend/`** - Go REST API with Ginkgo tests
  - Gin web framework
  - Ginkgo BDD testing
  - TIA coverage reporter for Go

### Python Examples  
- **`examples/python-backend/`** - Python Flask API with pytest
  - Flask REST API
  - pytest testing framework
  - TIA coverage plugin for Python

Each example includes:
- Complete application code
- Test setup with TIA integration
- Coverage collection configuration
- README with setup instructions

## 📖 Architecture

TIA.js uses **line-level coverage mapping** to provide surgical precision:

1. **Build-time instrumentation** (webpack/babel) tracks code coverage
2. **Per-test collection** stores individual test coverage profiles  
3. **Git diff parsing** identifies exact changed lines
4. **Coverage intersection** maps changed lines to covering tests
5. **Smart filtering** eliminates false positives from bundling

---

**License**: MIT  
**Repository**: https://github.com/your-org/tia-js