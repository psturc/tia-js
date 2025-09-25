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
      
      // Note: TIA now reads coverage data directly from .nyc_output/out.json
      // No custom tasks needed - @cypress/code-coverage handles everything

      return config;
    },
  },
});
