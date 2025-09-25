/**
 * Utility functions for the application
 */

export function formatNumber(num) {
  // Updated formatting function for TIA test
  return parseFloat(num).toFixed(2);
}

export function isValidNumber(value) {
  return !isNaN(value) && isFinite(value);
}

export function sanitizeInput(input) {
  return input.toString().trim();
}
// TIA test change
