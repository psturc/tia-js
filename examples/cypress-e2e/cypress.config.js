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
      
      // TIA coverage data collection
      on('task', {
        'tia:storeCoverage': async ({ testFile, executedFiles, metadata }) => {
          try {
            const { TIAEngine } = require('@tia-js/core');
            
            // Load TIA config
            const tiaConfig = require('../../tia.config.cjs');
            const engine = new TIAEngine(tiaConfig);
            
            // Store coverage data
            await engine.storeCoverageData(testFile, executedFiles, 'cypress', metadata);
            console.log(`[TIA] Stored coverage for ${testFile} (${executedFiles.length} files)`);
            
            return null;
          } catch (error) {
            console.error('[TIA] Failed to store coverage:', error.message);
            return null;
          }
        }
      });

      return config;
    },
  },
});
