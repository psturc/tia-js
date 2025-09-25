# Test Impact Analysis (TIA) for JavaScript/TypeScript

[![npm version](https://badge.fury.io/js/%40tia-js%2Fcli.svg)](https://badge.fury.io/js/%40tia-js%2Fcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Test Impact Analysis ecosystem that intelligently determines which tests to run based on code changes. Works across multiple testing frameworks with a unified API and CLI.

## 🚀 Features

- **Framework Agnostic**: Supports Jest, Cypress, and Playwright out of the box
- **Intelligent Analysis**: Uses dependency graph analysis to find affected tests
- **Git Integration**: Automatically detects changed files using Git
- **Watch Mode**: Continuously monitors file changes and runs tests
- **CLI & API**: Use via command line or integrate into your build pipeline
- **TypeScript First**: Built with TypeScript, includes full type definitions
- **Configurable**: Flexible configuration for different project structures

## 📦 Packages

This is a monorepo containing several packages:

- **[@tia-js/cli](./packages/cli)** - Universal CLI tool
- **[@tia-js/core](./packages/core)** - Core analysis engine
- **[@tia-js/common](./packages/common)** - Shared types and utilities
- **[@tia-js/cypress](./packages/cypress)** - Cypress adapter
- **[@tia-js/playwright](./packages/playwright)** - Playwright adapter
- **[@tia-js/jest](./packages/jest)** - Jest adapter

## 🔧 Quick Start

### Installation

```bash
# Install the CLI globally
npm install -g @tia-js/cli

# Or use with npx
npx @tia-js/cli --help
```

### Initialize Configuration

```bash
# Generate configuration file
tia init
```

### Basic Usage

```bash
# Analyze test impact
tia analyze

# Run affected tests
tia run

# Watch for changes and run tests automatically
tia watch
```

## 📖 Documentation

### CLI Commands

#### `tia init`
Initialize TIA configuration in your project.

```bash
tia init [options]

Options:
  -f, --force              Overwrite existing configuration
  --config-file <name>     Configuration file name (default: "tia.config.js")
```

#### `tia analyze`
Analyze which tests are affected by code changes.

```bash
tia analyze [options]

Options:
  -c, --config <path>      Path to configuration file
  -b, --base <commit>      Base commit/branch to compare against (default: "HEAD")
  --include-unstaged       Include unstaged changes
  --include-untracked      Include untracked files
  -f, --framework <name>   Force specific framework (cypress, playwright, jest)
  --max-depth <number>     Maximum dependency analysis depth (default: "10")
  --json                   Output results as JSON
  --verbose                Verbose output
```

#### `tia run`
Analyze and run affected tests.

```bash
tia run [options]

Options:
  -c, --config <path>      Path to configuration file
  -b, --base <commit>      Base commit/branch to compare against (default: "HEAD")
  --include-unstaged       Include unstaged changes
  --include-untracked      Include untracked files
  -f, --framework <name>   Force specific framework (cypress, playwright, jest)
  --max-depth <number>     Maximum dependency analysis depth (default: "10")
  --dry-run                Show what would be run without executing tests
  -y, --yes                Skip confirmation prompts
  --verbose                Verbose output
```

#### `tia watch`
Watch for file changes and run affected tests automatically.

```bash
tia watch [options]

Options:
  -c, --config <path>      Path to configuration file
  -b, --base <commit>      Base commit/branch to compare against (default: "HEAD")
  --include-unstaged       Include unstaged changes (default: true)
  --include-untracked      Include untracked files
  -f, --framework <name>   Force specific framework (cypress, playwright, jest)
  --max-depth <number>     Maximum dependency analysis depth (default: "10")
  --debounce <ms>          Debounce time for file changes (default: "1000")
  --auto-run               Automatically run tests without confirmation
  --verbose                Verbose output
```

### Configuration

Create a `tia.config.js` file in your project root:

```javascript
module.exports = {
  // Project root directory
  rootDir: process.cwd(),
  
  // Source file extensions to analyze
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  
  // Test file extensions
  testExtensions: ['.test.ts', '.test.tsx', '.test.js', '.test.jsx', '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx'],
  
  // Patterns to ignore during analysis
  ignorePatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**'],
  
  // Maximum depth for dependency analysis
  maxDepth: 10,
  
  // Include indirect dependencies
  includeIndirect: true,
  
  // Framework-specific configuration
  frameworks: {
    cypress: {
      configFile: 'cypress.config.js',
      specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'
    },
    playwright: {
      configFile: 'playwright.config.js',
      testDir: 'tests'
    },
    jest: {
      configFile: 'jest.config.js'
    }
  }
};
```

### API Usage

You can also use TIA programmatically:

```typescript
import { TIAEngine } from '@tia-js/core';
import { CypressAdapter } from '@tia-js/cypress';
import { PlaywrightAdapter } from '@tia-js/playwright';
import { JestAdapter } from '@tia-js/jest';

// Create TIA engine
const engine = new TIAEngine({
  rootDir: process.cwd(),
  sourceExtensions: ['.ts', '.js'],
  testExtensions: ['.test.ts', '.test.js'],
  maxDepth: 10
});

// Register framework adapters
engine.registerAdapter(new CypressAdapter());
engine.registerAdapter(new PlaywrightAdapter());
engine.registerAdapter(new JestAdapter());

// Run analysis
const result = await engine.analyze({
  base: 'main',
  includeUnstaged: true
});

console.log(\`Found \${result.affectedTests.length} affected tests\`);

// Run tests
await engine.runTests(result);
```

## 🏗️ Architecture

The TIA ecosystem follows a modular architecture:

```
┌─────────────────┐
│   @tia-js/cli   │  ← Universal CLI interface
└─────────────────┘
         │
┌─────────────────┐
│  @tia-js/core   │  ← Core analysis engine
└─────────────────┘
         │
┌─────────────────┐
│ @tia-js/common  │  ← Shared types & utilities
└─────────────────┘
         │
    ┌────┴────┐
    │ Adapters │
    └─────────┘
    │    │    │
┌───▼┐ ┌─▼─┐ ┌▼────┐
│Jest│ │Cyp│ │Plwr │  ← Framework-specific adapters
└────┘ └───┘ └─────┘
```

### Core Components

1. **TIA Engine**: Main orchestrator that coordinates analysis and test execution
2. **Dependency Analyzer**: Builds and analyzes the project dependency graph
3. **Change Detector**: Detects file changes using Git
4. **Framework Adapters**: Handle framework-specific test discovery and execution

## 🔄 How It Works

1. **Change Detection**: TIA uses Git to detect which files have changed
2. **Dependency Analysis**: Builds a dependency graph of your project
3. **Impact Calculation**: Determines which tests are affected by the changes
4. **Test Prioritization**: Assigns priority scores to tests based on impact
5. **Test Execution**: Runs the affected tests using the appropriate framework

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/tia-js.git
cd tia-js

# Install dependencies
npm install

# Bootstrap packages
npm run bootstrap

# Build all packages
npm run build

# Run tests
npm test
```

## 📄 License

MIT © [Your Name](https://github.com/your-org)

## 🙏 Acknowledgments

- Inspired by Facebook's Jest test runner and its watch mode
- Built with TypeScript and modern Node.js practices
- Uses Git for reliable change detection
