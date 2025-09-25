# Contributing to TIA-JS

Thank you for your interest in contributing to the Test Impact Analysis ecosystem! This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0
- Git

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/your-username/tia-js.git
cd tia-js
```

2. **Install dependencies**

```bash
npm install
```

3. **Bootstrap the monorepo**

```bash
npm run bootstrap
```

4. **Build all packages**

```bash
npm run build
```

5. **Run tests to verify setup**

```bash
npm test
```

## Project Structure

This is a Lerna monorepo with the following structure:

```
tia-js/
├── packages/
│   ├── common/          # Shared types and utilities
│   ├── core/            # Core TIA engine
│   ├── cypress/         # Cypress adapter
│   ├── playwright/      # Playwright adapter
│   ├── jest/            # Jest adapter
│   └── cli/             # Universal CLI tool
├── examples/            # Example projects
├── docs/               # Documentation
└── scripts/            # Build and utility scripts
```

### Package Dependencies

```
cli → core → common
      ↓
   adapters → common
```

## Development Workflow

### Making Changes

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**

Focus on one feature or bug fix per pull request.

3. **Write tests**

Ensure your changes are covered by tests.

4. **Run the development build**

```bash
npm run dev
```

This will start TypeScript compilation in watch mode for all packages.

5. **Test your changes**

```bash
# Run all tests
npm test

# Run tests for specific package
npm run test --workspace=@tia-js/core

# Run linting
npm run lint
```

### Package Scripts

Each package has the following scripts:

- `build` - Compile TypeScript
- `dev` - Compile in watch mode
- `test` - Run tests
- `lint` - Run ESLint
- `clean` - Remove build artifacts

### Root Scripts

- `npm run build` - Build all packages
- `npm run test` - Test all packages
- `npm run lint` - Lint all packages
- `npm run clean` - Clean all packages
- `npm run bootstrap` - Install and link dependencies
- `npm run dev` - Start development mode for all packages

## Testing

### Test Structure

- Unit tests: `src/**/*.test.ts`
- Integration tests: `src/**/*.integration.test.ts`
- E2E tests: `e2e/**/*.test.ts`

### Running Tests

```bash
# All tests
npm test

# Specific package
npm run test --workspace=@tia-js/core

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Writing Tests

- Use Jest for unit and integration tests
- Follow the existing test patterns
- Mock external dependencies
- Test both success and error cases
- Aim for high test coverage (>90%)

Example test:

```typescript
import { TIAEngine } from '../src/tia-engine';

describe('TIAEngine', () => {
  let engine: TIAEngine;

  beforeEach(() => {
    engine = new TIAEngine({
      rootDir: '/test/project',
      sourceExtensions: ['.ts', '.js'],
      testExtensions: ['.test.ts']
    });
  });

  it('should analyze file changes', async () => {
    const result = await engine.analyze();
    expect(result.changedFiles).toBeDefined();
    expect(result.affectedTests).toBeDefined();
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run the full test suite** and ensure it passes
4. **Update CHANGELOG.md** with your changes
5. **Submit a pull request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots for UI changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated documentation

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Changes are documented
```

### Commit Messages

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

Examples:
```
feat(core): add dependency graph caching
fix(cli): handle missing config file gracefully
docs: update installation instructions
```

## Release Process

We use Lerna for versioning and publishing:

1. **Version bump**
```bash
npm run version
```

2. **Publish**
```bash
npm run publish
```

### Versioning

- **Patch** (0.0.x): Bug fixes
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer interfaces over types
- Use explicit return types for public APIs
- Document public APIs with JSDoc

### Formatting

We use Prettier and ESLint:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Naming Conventions

- **Files**: kebab-case (`dependency-analyzer.ts`)
- **Classes**: PascalCase (`TIAEngine`)
- **Functions/Variables**: camelCase (`analyzeFiles`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIG`)
- **Interfaces**: PascalCase with 'I' prefix optional (`TIAConfig`)

## Documentation

### Code Documentation

- Use JSDoc for public APIs
- Include examples in documentation
- Document complex algorithms
- Keep README files up to date

### Adding Examples

Examples go in the `examples/` directory:

```
examples/
├── basic-jest/
├── cypress-e2e/
├── playwright-e2e/
└── monorepo-setup/
```

Each example should include:
- `README.md` with setup instructions
- `package.json` with dependencies
- `tia.config.js` configuration
- Sample source and test files

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our Discord server for real-time chat

## Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Package.json author/contributors fields

Thank you for contributing to TIA-JS! 🎉
