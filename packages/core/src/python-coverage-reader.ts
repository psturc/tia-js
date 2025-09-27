import * as fs from 'fs';
import * as path from 'path';
import { createLogger, Logger } from '@tia-js/common';

/**
 * Interface for Python coverage data in TIA format
 */
interface PythonCoverageData {
  [filePath: string]: {
    path: string;
    statementMap: Record<string, any>;
    fnMap: Record<string, any>;
    branchMap: Record<string, any>;
    s: Record<string, number>; // Statement hits
    f: Record<string, number>; // Function hits  
    b: Record<string, number[]>; // Branch hits
    _coverageSchema: string;
  };
}

/**
 * Reads and processes Python coverage output for TIA
 */
export class PythonCoverageReader {
  private logger: Logger;
  private rootDir: string;

  constructor(rootDir: string, logger?: Logger) {
    this.rootDir = rootDir;
    this.logger = logger || createLogger('info');
  }

  /**
   * Read Python coverage data from TIA per-test coverage files
   */
  async readPythonCoverage(): Promise<string[]> {
    const perTestCoverageDir = path.join(this.rootDir, '.tia', 'per-test-coverage');
    
    try {
      if (!fs.existsSync(perTestCoverageDir)) {
        this.logger.debug('No Python per-test coverage directory found');
        return [];
      }

      const coverageFiles = fs.readdirSync(perTestCoverageDir)
        .filter(file => file.endsWith('.json'));

      if (coverageFiles.length === 0) {
        this.logger.debug('No Python coverage files found');
        return [];
      }

      const allCoveredFiles = new Set<string>();

      // Process each coverage file
      for (const coverageFile of coverageFiles) {
        const filePath = path.join(perTestCoverageDir, coverageFile);
        
        try {
          const coverageData: PythonCoverageData = JSON.parse(
            fs.readFileSync(filePath, 'utf8')
          );

          // Extract covered files from this test's coverage
          Object.keys(coverageData).forEach(sourceFile => {
            const coverage = coverageData[sourceFile];
            
            // Check if any statements were executed
            const statementHits = Object.values(coverage.s || {});
            const hasStatementCoverage = statementHits.some(hits => hits > 0);
            
            if (hasStatementCoverage && this.isPythonSourceFile(sourceFile)) {
              allCoveredFiles.add(this.toRelativePath(sourceFile));
            }
          });

        } catch (error) {
          this.logger.debug(`Failed to process Python coverage file ${coverageFile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const coveredFiles = Array.from(allCoveredFiles);
      this.logger.debug(`Found ${coveredFiles.length} covered Python files`);
      return coveredFiles;

    } catch (error) {
      this.logger.error(`Failed to read Python coverage: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get detailed coverage statistics from Python coverage data
   */
  async getCoverageStats(): Promise<{
    totalFiles: number;
    coveredFiles: number;
    statements: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
  }> {
    const perTestCoverageDir = path.join(this.rootDir, '.tia', 'per-test-coverage');
    
    try {
      if (!fs.existsSync(perTestCoverageDir)) {
        return this.getEmptyStats();
      }

      const coverageFiles = fs.readdirSync(perTestCoverageDir)
        .filter(file => file.endsWith('.json'));

      if (coverageFiles.length === 0) {
        return this.getEmptyStats();
      }

      const aggregatedCoverage = new Map<string, PythonCoverageData[string]>();

      // Aggregate coverage from all test files
      for (const coverageFile of coverageFiles) {
        const filePath = path.join(perTestCoverageDir, coverageFile);
        
        try {
          const coverageData: PythonCoverageData = JSON.parse(
            fs.readFileSync(filePath, 'utf8')
          );

          // Merge coverage data
          for (const [sourceFile, coverage] of Object.entries(coverageData)) {
            if (!this.isPythonSourceFile(sourceFile)) continue;

            const relativeFile = this.toRelativePath(sourceFile);
            
            if (!aggregatedCoverage.has(relativeFile)) {
              aggregatedCoverage.set(relativeFile, { ...coverage });
            } else {
              // Merge statement hits (take maximum)
              const existing = aggregatedCoverage.get(relativeFile)!;
              for (const [stmtId, hits] of Object.entries(coverage.s || {})) {
                existing.s[stmtId] = Math.max(existing.s[stmtId] || 0, hits);
              }
              for (const [fnId, hits] of Object.entries(coverage.f || {})) {
                existing.f[fnId] = Math.max(existing.f[fnId] || 0, hits);
              }
            }
          }

        } catch (error) {
          this.logger.debug(`Failed to process Python coverage file ${coverageFile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Calculate statistics
      let totalStatements = 0, coveredStatements = 0;
      let totalFunctions = 0, coveredFunctions = 0;
      let totalBranches = 0, coveredBranches = 0;
      let coveredFiles = 0;

      for (const coverage of aggregatedCoverage.values()) {
        // Statement coverage
        const statements = Object.values(coverage.s || {});
        totalStatements += statements.length;
        coveredStatements += statements.filter(hits => hits > 0).length;

        // Function coverage
        const functions = Object.values(coverage.f || {});
        totalFunctions += functions.length;
        coveredFunctions += functions.filter(hits => hits > 0).length;

        // Branch coverage (if available)
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
        totalFiles: aggregatedCoverage.size,
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
      this.logger.error(`Failed to get Python coverage stats: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if Python coverage data exists
   */
  hasPythonCoverage(): boolean {
    const perTestCoverageDir = path.join(this.rootDir, '.tia', 'per-test-coverage');
    
    if (!fs.existsSync(perTestCoverageDir)) {
      return false;
    }

    const coverageFiles = fs.readdirSync(perTestCoverageDir)
      .filter(file => file.endsWith('.json'));

    // Check if any file contains Python coverage schema
    return coverageFiles.some(file => {
      try {
        const filePath = path.join(perTestCoverageDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Look for Python coverage schema in any file
        return Object.values(data).some((coverage: any) => 
          coverage._coverageSchema && coverage._coverageSchema.includes('python-coverage')
        );
      } catch {
        return false;
      }
    });
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
   * Check if a file is a Python source file (not test file)
   */
  private isPythonSourceFile(filePath: string): boolean {
    return filePath.endsWith('.py') &&
           !filePath.includes('/test') &&
           !filePath.includes('test_') &&
           !filePath.includes('_test.py') &&
           !filePath.includes('/tests/') &&
           !filePath.includes('conftest.py') &&
           !filePath.includes('pytest_') &&
           !filePath.includes('node_modules') &&
           !filePath.includes('__pycache__');
  }

  /**
   * Get empty statistics structure
   */
  private getEmptyStats() {
    return {
      totalFiles: 0,
      coveredFiles: 0,
      statements: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 }
    };
  }
}

