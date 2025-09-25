import * as fs from 'fs';
import * as path from 'path';
import { createLogger, Logger } from '@tia-js/common';

/**
 * Interface for NYC/Istanbul coverage data
 */
interface NYCCoverageData {
  [filePath: string]: {
    path: string;
    statementMap: Record<string, any>;
    fnMap: Record<string, any>;
    branchMap: Record<string, any>;
    s: Record<string, number>; // Statement hits
    f: Record<string, number>; // Function hits  
    b: Record<string, number[]>; // Branch hits
  };
}

/**
 * Reads and processes NYC/Istanbul coverage output for TIA
 */
export class NYCCoverageReader {
  private logger: Logger;
  private rootDir: string;

  constructor(rootDir: string, logger?: Logger) {
    this.rootDir = rootDir;
    this.logger = logger || createLogger('info');
  }

  /**
   * Read NYC coverage data and extract covered files
   */
  async readNYCCoverage(): Promise<string[]> {
    const nycOutputPath = path.join(this.rootDir, '.nyc_output', 'out.json');
    
    try {
      if (!fs.existsSync(nycOutputPath)) {
        this.logger.debug('No NYC coverage output found');
        return [];
      }

      const coverageData: NYCCoverageData = JSON.parse(
        fs.readFileSync(nycOutputPath, 'utf8')
      );

      const coveredFiles = Object.keys(coverageData)
        .filter(filePath => {
          const coverage = coverageData[filePath];
          
          // Check if any statements were executed
          const statementHits = Object.values(coverage.s || {});
          const hasStatementCoverage = statementHits.some(hits => hits > 0);
          
          // Check if any functions were executed  
          const functionHits = Object.values(coverage.f || {});
          const hasFunctionCoverage = functionHits.some(hits => hits > 0);
          
          return hasStatementCoverage || hasFunctionCoverage;
        })
        .map(filePath => {
          // Convert to relative path
          return this.toRelativePath(filePath);
        })
        .filter(filePath => {
          // Only include source files, not test files
          return this.isSourceFile(filePath);
        });

      this.logger.debug(`Found ${coveredFiles.length} covered files in NYC output`);
      return coveredFiles;

    } catch (error) {
      this.logger.error(`Failed to read NYC coverage: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get detailed coverage statistics from NYC data
   */
  async getCoverageStats(): Promise<{
    totalFiles: number;
    coveredFiles: number;
    statements: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
  }> {
    const nycOutputPath = path.join(this.rootDir, '.nyc_output', 'out.json');
    
    try {
      if (!fs.existsSync(nycOutputPath)) {
        return {
          totalFiles: 0,
          coveredFiles: 0,
          statements: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 }
        };
      }

      const coverageData: NYCCoverageData = JSON.parse(
        fs.readFileSync(nycOutputPath, 'utf8')
      );

      let totalStatements = 0, coveredStatements = 0;
      let totalFunctions = 0, coveredFunctions = 0;
      let totalBranches = 0, coveredBranches = 0;
      let coveredFiles = 0;

      for (const [filePath, coverage] of Object.entries(coverageData)) {
        if (!this.isSourceFile(this.toRelativePath(filePath))) continue;

        // Statement coverage
        const statements = Object.values(coverage.s || {});
        totalStatements += statements.length;
        coveredStatements += statements.filter(hits => hits > 0).length;

        // Function coverage
        const functions = Object.values(coverage.f || {});
        totalFunctions += functions.length;
        coveredFunctions += functions.filter(hits => hits > 0).length;

        // Branch coverage
        const branches = Object.values(coverage.b || {});
        totalBranches += branches.length;
        coveredBranches += branches.filter(branchHits => 
          Array.isArray(branchHits) && branchHits.some(hits => hits > 0)
        ).length;

        // File has coverage if any statements/functions were hit
        if (statements.some(hits => hits > 0) || functions.some(hits => hits > 0)) {
          coveredFiles++;
        }
      }

      return {
        totalFiles: Object.keys(coverageData).length,
        coveredFiles,
        statements: {
          total: totalStatements,
          covered: coveredStatements,
          percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
        },
        functions: {
          total: totalFunctions,
          covered: coveredFunctions,
          percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
        },
        branches: {
          total: totalBranches,
          covered: coveredBranches,
          percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0
        }
      };

    } catch (error) {
      this.logger.error(`Failed to get NYC coverage stats: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if NYC coverage data exists
   */
  hasNYCCoverage(): boolean {
    const nycOutputPath = path.join(this.rootDir, '.nyc_output', 'out.json');
    return fs.existsSync(nycOutputPath);
  }

  /**
   * Convert absolute path to relative path
   */
  private toRelativePath(absolutePath: string): string {
    if (absolutePath.startsWith(this.rootDir)) {
      return path.relative(this.rootDir, absolutePath);
    }
    return absolutePath;
  }

  /**
   * Check if a file is a source file (not test file)
   */
  private isSourceFile(filePath: string): boolean {
    return !filePath.includes('node_modules') &&
           !filePath.includes('/cypress/') &&
           !filePath.includes('/test/') &&
           !filePath.includes('/spec/') &&
           !filePath.endsWith('.test.js') &&
           !filePath.endsWith('.spec.js') &&
           !filePath.endsWith('.cy.js') &&
           (filePath.includes('/src/') || filePath.startsWith('src/'));
  }
}
