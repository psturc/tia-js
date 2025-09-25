/**
 * Utility functions for Test Impact Analysis
 */

import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Normalize file paths to be consistent across platforms
 */
export function normalizePath(filePath: string): string {
  return path.posix.normalize(filePath.replace(/\\/g, '/'));
}

/**
 * Check if a file path matches any of the given patterns
 */
export function matchesPatterns(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  });
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find files matching patterns
 */
export async function findFiles(
  rootDir: string, 
  patterns: string[], 
  ignorePatterns: string[] = []
): Promise<string[]> {
  const files: string[] = [];
  
  async function searchDir(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootDir, fullPath);
        
        // Skip ignored paths
        if (ignorePatterns.length > 0 && matchesPatterns(relativePath, ignorePatterns)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Skip common directories that shouldn't contain source/test files
          if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            continue;
          }
          await searchDir(fullPath);
        } else if (entry.isFile()) {
          if (matchesPatterns(relativePath, patterns)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }
  
  await searchDir(rootDir);
  return files.sort();
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if a file is a test file based on common patterns
 */
export function isTestFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  const testPatterns = [
    /\.test\./,
    /\.spec\./,
    /\.cy\./,     // Cypress test files
    /_test\./,
    /_spec\./,
    /^test_/,
    /^spec_/
  ];
  
  return testPatterns.some(pattern => pattern.test(basename)) ||
         filePath.includes('/test/') ||
         filePath.includes('/tests/') ||
         filePath.includes('/__tests__/') ||
         filePath.includes('/spec/') ||
         filePath.includes('/specs/') ||
         (filePath.includes('/cypress/') && 
          (filePath.includes('/e2e/') || filePath.includes('/integration/') || basename.includes('.cy.')));
}

/**
 * Calculate relative path between two files
 */
export function getRelativePath(from: string, to: string): string {
  return normalizePath(path.relative(path.dirname(from), to));
}

/**
 * Deep merge two objects
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (
        sourceValue && 
        typeof sourceValue === 'object' && 
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Create a hash from a string (simple implementation)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Create a logger with different levels
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export function createLogger(level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Logger {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level];
  
  return {
    debug: (message: string, ...args: any[]) => {
      if (currentLevel <= 0) console.debug(`[DEBUG] ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
      if (currentLevel <= 1) console.info(`[INFO] ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      if (currentLevel <= 2) console.warn(`[WARN] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      if (currentLevel <= 3) console.error(`[ERROR] ${message}`, ...args);
    }
  };
}
