const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Code coverage setup
      require('@cypress/code-coverage/task')(on, config)
      
      // TIA coverage data collection
      on('task', {
        'tia:storeCoverage': async ({ testFile, executedFiles, metadata }) => {
          const { TIAEngine } = require('@tia-js/core');
          
          try {
            // Load TIA config
            const tiaConfig = require('../../tia.config.js');
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

      return config
    },
  },
});
