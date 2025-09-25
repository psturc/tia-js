/**
 * Test Impact Analysis Configuration for Jest Example
 */

module.exports = {
  rootDir: __dirname,
  sourceExtensions: ['.ts', '.js'],
  testExtensions: ['.test.ts', '.test.js'],
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'coverage/**'
  ],
  maxDepth: 10,
  includeIndirect: true,
  frameworks: {
    jest: {
      configFile: 'jest.config.js'
    }
  }
};
