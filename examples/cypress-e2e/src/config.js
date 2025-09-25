/**
 * Application configuration - not covered by tests
 */

export const APP_CONFIG = {
  version: '1.0.0',
  apiUrl: 'https://api.example.com',
  debug: false
};

export function getVersion() {
  return APP_CONFIG.version;
}
