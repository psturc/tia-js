/**
 * Application configuration - not covered by tests
 */

export const APP_CONFIG = {
  version: '1.0.2', // Updated again for TIA coverage test
  apiUrl: 'https://api.example.com',
  debug: false
};

export function getVersion() {
  return APP_CONFIG.version;
}
// Configuration change for TIA test
