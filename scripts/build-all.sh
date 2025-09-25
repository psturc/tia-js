#!/bin/bash

# Build script for TIA-JS ecosystem
set -e

echo "🚀 Building TIA-JS Ecosystem..."
echo "================================"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Bootstrap packages
echo "🔗 Bootstrapping packages..."
npm run bootstrap

# Build all packages
echo "🔨 Building all packages..."
npm run build

# Run linting
echo "🔍 Running linter..."
npm run lint

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📋 Available packages:"
echo "  • @tia-js/common   - Shared types and utilities"
echo "  • @tia-js/core     - Core TIA engine"
echo "  • @tia-js/cypress  - Cypress adapter"
echo "  • @tia-js/playwright - Playwright adapter"
echo "  • @tia-js/jest     - Jest adapter"
echo "  • @tia-js/cli      - Universal CLI tool"
echo ""
echo "🎯 Next steps:"
echo "  1. Try the CLI: npx @tia-js/cli --help"
echo "  2. Run examples: cd examples/basic-jest && npm run tia:analyze"
echo "  3. Read documentation: README.md"
echo ""
