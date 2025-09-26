/**
 * Jest Reporter for TIA Per-Test Coverage Collection
 */

const fs = require('fs');
const path = require('path');

class TIAReporter {
  constructor(globalConfig, reporterOptions) {
    this.globalConfig = globalConfig;
    this.reporterOptions = reporterOptions;
    this.perTestCoverageDir = path.join(process.cwd(), '.tia', 'per-test-coverage');
    
    // Ensure directory exists
    if (!fs.existsSync(this.perTestCoverageDir)) {
      fs.mkdirSync(this.perTestCoverageDir, { recursive: true });
    }
  }

  onTestResult(test, testResult) {
    // Only process if we have coverage data
    if (!testResult.coverage) {
      return;
    }

    // Process each test case individually
    testResult.testResults.forEach((testCase) => {
      const testName = testCase.fullName;
      const specFile = path.relative(process.cwd(), test.path);
      
      // Create safe filename
      const safeSpecName = specFile.replace(/[^a-zA-Z0-9]/g, '_');
      const safeTestName = testName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safeSpecName}__${safeTestName}.json`;
      
      // Save coverage data for this specific test
      const coverageFilePath = path.join(this.perTestCoverageDir, fileName);
      
      try {
        fs.writeFileSync(
          coverageFilePath, 
          JSON.stringify(testResult.coverage, null, 2)
        );
        console.log(`[TIA] Saved coverage: ${fileName}`);
      } catch (error) {
        console.warn(`[TIA] Failed to save coverage for ${testName}:`, error.message);
      }
    });
  }
}

module.exports = TIAReporter;
