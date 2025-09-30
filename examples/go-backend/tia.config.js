module.exports = {
  // Root directory for analysis (go-backend subdirectory)
  rootDir: require('path').join(__dirname),
  
  // Test patterns to identify test files
  testPatterns: [
    'tests/**/*.spec.js',
    'tests/**/*.test.js'
  ],
  
  // Source patterns to identify source files
  sourcePatterns: [
    'main.go',
    '**/*.go',
    '!**/*_test.go'
  ],
  
  // Coverage configuration
  coverage: {
    // Directory where per-test coverage files are stored
    perTestCoverageDir: '.tia/per-test-coverage',
    
    // Coverage format (go-coverage for Go applications)
    format: 'go-coverage',
    
    // Threshold for coverage analysis
    threshold: 0.8
  },
  
  // Git configuration
  git: {
    // Base branch for comparison
    baseBranch: 'main',
    
    // Include untracked files in analysis
    includeUntracked: true
  },
  
  // Analysis configuration
  analysis: {
    // Use heuristic analysis when coverage data is not available
    useHeuristics: true,
    
    // Include dependency analysis
    includeDependencies: true
  },
  
  // Logging configuration
  logging: {
    level: 'info'
  }
};
