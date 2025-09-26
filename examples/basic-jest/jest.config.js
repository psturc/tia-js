module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Coverage configuration for TIA
  coverageDirectory: '.tia/jest-coverage',
  coverageReporters: ['json', 'lcov', 'text'],
  collectCoverage: true,
  
  // Enable per-test coverage collection
  reporters: [
    'default',
    ['<rootDir>/jest-tia-reporter.js', {}]
  ]
};