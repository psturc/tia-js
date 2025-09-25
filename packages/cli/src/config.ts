/**
 * Configuration loading and management
 */

import * as path from 'path';
import { promises as fs } from 'fs';
import { TIAConfig, fileExists, deepMerge } from '@tia-js/common';

/**
 * Default TIA configuration
 */
const DEFAULT_CONFIG: Partial<TIAConfig> = {
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  testExtensions: ['.test.ts', '.test.tsx', '.test.js', '.test.jsx', '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx'],
  ignorePatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**'],
  maxDepth: 10,
  includeIndirect: true
};

/**
 * Load TIA configuration from file or use defaults
 */
export async function loadConfig(
  configPath?: string, 
  overrides: Partial<TIAConfig> = {}
): Promise<TIAConfig> {
  let config: Partial<TIAConfig> = { ...DEFAULT_CONFIG };
  
  // Determine config file path
  const resolvedConfigPath = await resolveConfigPath(configPath);
  
  if (resolvedConfigPath) {
    try {
      const loadedConfig = await loadConfigFile(resolvedConfigPath);
      config = deepMerge(config, loadedConfig);
    } catch (error) {
      console.warn(`Warning: Failed to load config file ${resolvedConfigPath}:`, error);
    }
  }

  // Apply overrides
  config = deepMerge(config, overrides);

  // Ensure rootDir is set
  if (!config.rootDir) {
    config.rootDir = process.cwd();
  }

  return config as TIAConfig;
}

/**
 * Resolve configuration file path
 */
async function resolveConfigPath(configPath?: string): Promise<string | null> {
  if (configPath) {
    // Use provided path
    if (path.isAbsolute(configPath)) {
      return configPath;
    } else {
      return path.resolve(process.cwd(), configPath);
    }
  }

  // Look for common config file names
  const configFiles = [
    'tia.config.js',
    'tia.config.ts',
    'tia.config.mjs',
    'tia.config.cjs',
    'tia.config.json',
    '.tiarc.js',
    '.tiarc.ts',
    '.tiarc.json'
  ];

  for (const configFile of configFiles) {
    const fullPath = path.resolve(process.cwd(), configFile);
    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  // Check package.json for tia config
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (await fileExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.tia) {
        return packageJsonPath;
      }
    } catch {
      // Ignore package.json parsing errors
    }
  }

  return null;
}

/**
 * Load configuration from a file
 */
async function loadConfigFile(configPath: string): Promise<Partial<TIAConfig>> {
  const ext = path.extname(configPath);
  
  if (ext === '.json') {
    // JSON configuration
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // If it's package.json, extract the tia config
    if (path.basename(configPath) === 'package.json') {
      return parsed.tia || {};
    }
    
    return parsed;
  } else {
    // JavaScript/TypeScript configuration
    // In a real implementation, you'd want to use dynamic imports
    // For now, we'll try to parse as JSON-like object
    const content = await fs.readFile(configPath, 'utf-8');
    
    try {
      // Simple regex-based extraction for module.exports
      const moduleExportsMatch = content.match(/module\.exports\s*=\s*({[\s\S]*?});?\s*$/m);
      if (moduleExportsMatch) {
        // This is a very simplified approach - in production you'd want proper AST parsing
        const configStr = moduleExportsMatch[1];
        const jsonStr = configStr
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote keys
          .replace(/'/g, '"') // Convert single quotes to double quotes
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
        
        return JSON.parse(jsonStr);
      }
    } catch (parseError) {
      console.warn(`Warning: Could not parse config file ${configPath}, using defaults`);
    }
    
    return {};
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: TIAConfig): string[] {
  const errors: string[] = [];

  if (!config.rootDir) {
    errors.push('rootDir is required');
  }

  if (!config.sourceExtensions || config.sourceExtensions.length === 0) {
    errors.push('sourceExtensions must be a non-empty array');
  }

  if (!config.testExtensions || config.testExtensions.length === 0) {
    errors.push('testExtensions must be a non-empty array');
  }

  if (config.maxDepth !== undefined && (config.maxDepth < 1 || config.maxDepth > 100)) {
    errors.push('maxDepth must be between 1 and 100');
  }

  return errors;
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: TIAConfig, configPath?: string): Promise<string> {
  const targetPath = configPath || path.resolve(process.cwd(), 'tia.config.js');
  
  const configContent = `/**
 * Test Impact Analysis Configuration
 */

module.exports = ${JSON.stringify(config, null, 2)};
`;

  await fs.writeFile(targetPath, configContent, 'utf-8');
  return targetPath;
}
