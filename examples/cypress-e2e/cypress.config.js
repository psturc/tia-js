import { defineConfig } from 'cypress';
import { createRequire } from 'module';

// Create require function for CommonJS modules
const require = createRequire(import.meta.url);

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Code coverage setup
      try {
        require('@cypress/code-coverage/task')(on, config);
      } catch (error) {
        console.warn('[Coverage] Code coverage plugin failed to load:', error.message);
      }
      
      // Per-test coverage collection for TIA
      on('task', {
        saveCoveragePerTest({ testName, specName, coverage }) {
          try {
            const fs = require('fs');
            const path = require('path');
            
            // Create per-test coverage directory
            const outDir = path.join(process.cwd(), '.tia', 'per-test-coverage');
            if (!fs.existsSync(outDir)) {
              fs.mkdirSync(outDir, { recursive: true });
            }
            
            // Create safe filename from test name
            const safeTestName = testName.replace(/[^a-zA-Z0-9]/g, '_');
            const safeSpecName = specName.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${safeSpecName}__${safeTestName}.json`;
            
            // Save coverage data
            const filePath = path.join(outDir, fileName);
            fs.writeFileSync(filePath, JSON.stringify(coverage, null, 2));
            
            console.log(`[TIA] Saved per-test coverage: ${fileName}`);
            return null;
            
          } catch (error) {
            console.error('[TIA] Failed to save per-test coverage:', error.message);
            return null;
          }
        }
      });

      return config;
    },
  },
});
