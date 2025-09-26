/**
 * Line-level Test Impact Analysis
 * Determines which tests cover the exact lines that were changed
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createLogger, Logger, TestCoverageData } from '@tia-js/common';

export interface LineChange {
  file: string;
  lines: number[];
  changeType: 'added' | 'modified' | 'deleted';
}

export interface LineCoverageResult {
  testFile: string;
  testName: string;
  coveredLines: number[];
  missedLines: number[];
  coveragePercentage: number;
}

export interface LineAnalysisResult {
  changedLines: LineChange[];
  coveringTests: LineCoverageResult[];
  uncoveredLines: number[];
  summary: {
    totalChangedLines: number;
    coveredChangedLines: number;
    coveragePercentage: number;
    affectedTests: number;
  };
}

export class LineLevelAnalyzer {
  private rootDir: string;
  private logger: Logger;

  constructor(rootDir: string, logger: Logger) {
    this.rootDir = rootDir;
    this.logger = logger;
  }

  /**
   * Analyze which tests cover the exact lines that changed
   */
  async analyzeChangedLines(changedFiles: string[]): Promise<LineAnalysisResult> {
    this.logger.info('Starting line-level coverage analysis...');
    
    const changedLines = await this.getChangedLines(changedFiles);
    const coveringTests: LineCoverageResult[] = [];
    const uncoveredLines: number[] = [];

    // Process each changed file
    for (const change of changedLines) {
      this.logger.debug(`Analyzing ${change.lines.length} changed lines in ${change.file}`);
      
      const testsForFile = await this.findTestsCoveringLines(change.file, change.lines);
      coveringTests.push(...testsForFile);
      
      // Find lines not covered by any test
      const coveredLineNumbers = new Set(testsForFile.flatMap(t => t.coveredLines));
      const uncovered = change.lines.filter(line => !coveredLineNumbers.has(line));
      uncoveredLines.push(...uncovered);
    }

    const totalChangedLines = changedLines.reduce((sum, change) => sum + change.lines.length, 0);
    const coveredChangedLines = totalChangedLines - uncoveredLines.length;

    return {
      changedLines,
      coveringTests,
      uncoveredLines,
      summary: {
        totalChangedLines,
        coveredChangedLines,
        coveragePercentage: totalChangedLines > 0 ? (coveredChangedLines / totalChangedLines) * 100 : 0,
        affectedTests: new Set(coveringTests.map(t => t.testFile)).size
      }
    };
  }

  /**
   * Get the specific lines that changed in each file
   */
  private async getChangedLines(changedFiles: string[]): Promise<LineChange[]> {
    const changes: LineChange[] = [];

    for (const file of changedFiles) {
      try {
        // Get detailed diff for the file - prioritize actual changes over new file detection
        let diffOutput: string;
        try {
          // First try to get real diff against HEAD
          diffOutput = execSync(
            `git diff --unified=0 HEAD "${file}"`,
            { 
              cwd: this.rootDir,
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe']
            }
          );
          
          // If no output, it might be a new file
          if (!diffOutput.trim()) {
            diffOutput = execSync(
              `git diff --no-index --unified=0 /dev/null "${file}"`,
              { 
                cwd: this.rootDir,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
              }
            );
          }
        } catch (error) {
          // Fallback for new files
          try {
            diffOutput = execSync(
              `git diff --no-index --unified=0 /dev/null "${file}"`,
              { 
                cwd: this.rootDir,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
              }
            );
          } catch {
            diffOutput = "new file";
          }
        }

        const lineNumbers = this.parseDiffForLineNumbers(diffOutput);
        
        if (lineNumbers.length > 0) {
          changes.push({
            file,
            lines: lineNumbers,
            changeType: diffOutput.includes('new file') ? 'added' : 'modified'
          });
        }

      } catch (error) {
        this.logger.warn(`Failed to get diff for ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return changes;
  }

  /**
   * Parse git diff output to extract changed line numbers
   */
  private parseDiffForLineNumbers(diffOutput: string): number[] {
    const lines: number[] = [];
    const diffLines = diffOutput.split('\n');

    for (const line of diffLines) {
      // Look for hunk headers like "@@ -0,0 +1,5 @@" or "@@ -10,3 +10,4 @@"
      const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      
      if (hunkMatch) {
        const startLine = parseInt(hunkMatch[3]); // Start line in new file
        const lineCount = parseInt(hunkMatch[4]) || 1; // Number of lines, default 1
        
        // Add all lines in this hunk
        for (let i = 0; i < lineCount; i++) {
          lines.push(startLine + i);
        }
      }
    }

    return [...new Set(lines)].sort((a, b) => a - b); // Remove duplicates and sort
  }

  /**
   * Find tests that cover specific lines in a file
   */
  private async findTestsCoveringLines(file: string, lines: number[]): Promise<LineCoverageResult[]> {
    const results: LineCoverageResult[] = [];
    const perTestDir = path.join(this.rootDir, '.tia', 'per-test-coverage');
    
    if (!fs.existsSync(perTestDir)) {
      this.logger.debug('No per-test coverage directory found');
      return results;
    }

    const coverageFiles = fs.readdirSync(perTestDir).filter(f => f.endsWith('.json'));
    
    for (const coverageFile of coverageFiles) {
      try {
        const coverageData = JSON.parse(
          fs.readFileSync(path.join(perTestDir, coverageFile), 'utf-8')
        );

        // Find the coverage for our specific file
        const fileCoverage = this.findFileCoverageInData(coverageData, file);
        
        if (fileCoverage) {
          const lineCoverage = this.analyzeLineCoverage(fileCoverage, lines);
          
          if (lineCoverage.coveredLines.length > 0) {
            // Parse test info from filename
            const [specName, testName] = coverageFile.replace('.json', '').split('__', 2);
            const normalizedSpecName = this.normalizeSpecName(specName);
            
            results.push({
              testFile: normalizedSpecName,
              testName: testName?.replace(/_/g, ' ') || 'unknown',
              coveredLines: lineCoverage.coveredLines,
              missedLines: lineCoverage.missedLines,
              coveragePercentage: lineCoverage.coveragePercentage
            });
          }
        }
        
      } catch (error) {
        this.logger.debug(`Failed to process coverage file ${coverageFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return results;
  }

  /**
   * Find coverage data for a specific file in the coverage object
   */
  private findFileCoverageInData(coverageData: any, targetFile: string): any {
    const normalizedTargetFile = path.resolve(this.rootDir, targetFile);
    
    this.logger.debug(`Looking for coverage of: ${targetFile}`);
    this.logger.debug(`Normalized target: ${normalizedTargetFile}`);
    
    // Look for the file in coverage data (could be absolute or relative path)
    for (const [filePath, coverage] of Object.entries(coverageData)) {
      const normalizedFilePath = path.resolve(filePath);
      
      this.logger.debug(`Checking coverage file: ${filePath} -> ${normalizedFilePath}`);
      
      if (normalizedFilePath === normalizedTargetFile) {
        this.logger.debug(`✅ Found coverage match for ${targetFile}`);
        return coverage;
      }
    }
    
    this.logger.debug(`❌ No coverage found for ${targetFile}`);
    return null;
  }

  /**
   * Analyze which specific lines are covered vs missed
   */
  private analyzeLineCoverage(fileCoverage: any, targetLines: number[]): {
    coveredLines: number[];
    missedLines: number[];
    coveragePercentage: number;
  } {
    const coveredLines: number[] = [];
    const missedLines: number[] = [];
    
    const statementMap = fileCoverage.statementMap || {};
    const statements = fileCoverage.s || {};

    // For each statement, check if it overlaps with our target lines
    for (const [statementId, statementInfo] of Object.entries(statementMap)) {
      const statement = statementInfo as { start: { line: number }; end: { line: number } };
      const executionCount = statements[statementId] || 0;
      
      // Check if this statement overlaps with any of our target lines
      const statementLines = this.getStatementLines(statement);
      const overlappingLines = statementLines.filter(line => targetLines.includes(line));
      
      if (overlappingLines.length > 0) {
        if (executionCount > 0) {
          coveredLines.push(...overlappingLines);
        } else {
          missedLines.push(...overlappingLines);
        }
      }
    }

    // Remove duplicates and sort
    const uniqueCoveredLines = [...new Set(coveredLines)].sort((a, b) => a - b);
    const uniqueMissedLines = [...new Set(missedLines)].sort((a, b) => a - b);
    
    const totalTargetLines = targetLines.length;
    const coveredTargetLines = uniqueCoveredLines.length;
    const coveragePercentage = totalTargetLines > 0 ? (coveredTargetLines / totalTargetLines) * 100 : 0;

    return {
      coveredLines: uniqueCoveredLines,
      missedLines: uniqueMissedLines,
      coveragePercentage
    };
  }

  /**
   * Get all line numbers that a statement spans
   */
  private getStatementLines(statement: { start: { line: number }; end: { line: number } }): number[] {
    const lines: number[] = [];
    for (let line = statement.start.line; line <= statement.end.line; line++) {
      lines.push(line);
    }
    return lines;
  }

  /**
   * Normalize spec file name from coverage filename
   */
  private normalizeSpecName(specName: string): string {
    return specName
      .replace(/_cy_js$/, '.cy.js')
      .replace(/_test_ts$/, '.test.ts')    // Handle TypeScript test files
      .replace(/_test_js$/, '.test.js')    // Handle JavaScript test files
      .replace(/_spec_ts$/, '.spec.ts')    // Handle TypeScript spec files
      .replace(/_spec_js$/, '.spec.js')    // Handle JavaScript spec files
      .replace(/_ts$/, '.ts')              // Handle TypeScript files
      .replace(/_js$/, '.js')              // Handle JavaScript files
      .replace(/_/g, '/');                 // Convert remaining underscores to slashes
  }
}
