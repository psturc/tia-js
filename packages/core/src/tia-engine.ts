/**
 * Main Test Impact Analysis Engine
 */

import * as path from 'path';
import { 
  TIAConfig, 
  TIAResult, 
  ChangedFile, 
  TestFile, 
  ChangeDetectionOptions,
  DependencyGraph,
  TIAAdapter
} from '@tia-js/common';
import { 
  findFiles, 
  isTestFile, 
  normalizePath, 
  deepMerge, 
  createLogger,
  Logger 
} from '@tia-js/common';
import { DependencyAnalyzer } from './dependency-analyzer';
import { ChangeDetector } from './change-detector';
import { CoverageAnalyzer } from './coverage-analyzer';

/**
 * Core Test Impact Analysis Engine
 */
export class TIAEngine {
  private config: TIAConfig;
  private dependencyAnalyzer: DependencyAnalyzer;
  private changeDetector: ChangeDetector;
  private coverageAnalyzer: CoverageAnalyzer;
  private logger: Logger;
  private adapters: Map<string, TIAAdapter> = new Map();

  constructor(config: TIAConfig) {
    this.config = this.normalizeConfig(config);
    this.logger = createLogger('info');
    this.dependencyAnalyzer = new DependencyAnalyzer(this.config);
    this.changeDetector = new ChangeDetector(this.config.rootDir);
    this.coverageAnalyzer = new CoverageAnalyzer(this.config.rootDir, this.logger);
  }

  /**
   * Register a framework adapter
   */
  registerAdapter(adapter: TIAAdapter): void {
    this.adapters.set(adapter.name, adapter);
    this.logger.debug(`Registered adapter: ${adapter.name}`);
  }

  /**
   * Run Test Impact Analysis with coverage-based analysis
   */
  async analyzeCoverage(options: ChangeDetectionOptions = {}): Promise<TIAResult> {
    const startTime = Date.now();
    this.logger.info('Starting Test Impact Analysis with coverage...');

    try {
      // Step 1: Detect changes
      this.logger.info('Detecting file changes...');
      const changedFiles = await this.changeDetector.detectChanges(options);
      this.logger.info(`Found ${changedFiles.length} changed files`);

      // Step 2: Analyze using coverage data
      this.logger.info('Analyzing coverage data...');
      const coverageAnalysis = await this.coverageAnalyzer.analyzeAffectedTests(
        changedFiles.map(f => f.path),
        'heuristic' // fallback to heuristic if no coverage
      );

      let affectedTests = coverageAnalysis.affectedTests;

      // Step 3: If no coverage data or fallback needed, use traditional analysis
      if (!coverageAnalysis.hasCoverageData || coverageAnalysis.fallbackStrategy === 'heuristic') {
        this.logger.info('Using traditional dependency analysis as fallback...');
        
        // Find all source and test files
        const allFiles = await this.findAllFiles();
        
        // Build dependency graph
        const dependencyGraph = await this.dependencyAnalyzer.buildGraph(allFiles);
        
        // Calculate affected tests using traditional method
        const traditionalTests = this.calculateAffectedTests(changedFiles, dependencyGraph);
        
        // Merge with coverage-based results
        const testMap = new Map<string, TestFile>();
        
        // Add coverage-based tests (higher priority)
        affectedTests.forEach(test => testMap.set(test.path, test));
        
        // Add traditional tests (lower priority if not already covered)
        traditionalTests.forEach(test => {
          if (!testMap.has(test.path)) {
            testMap.set(test.path, {
              ...test,
              reason: test.reason,
              priority: Math.max(0, test.priority - 10) // Lower priority
            });
          }
        });
        
        affectedTests = Array.from(testMap.values());
      }

      const analysisTime = Date.now() - startTime;
      const currentCommit = await this.changeDetector.getCurrentCommit();

      // Get coverage stats
      const coverageStats = await this.coverageAnalyzer.getCoverageStats();

      const result: TIAResult = {
        changedFiles,
        affectedTests,
        totalTests: coverageStats.totalTests || affectedTests.length,
        metadata: {
          analysisTime,
          baseCommit: currentCommit || undefined,
          usedCoverage: coverageAnalysis.hasCoverageData,
          coverageStats: {
            totalTests: coverageStats.totalTests,
            totalSourceFiles: coverageStats.totalSourceFiles,
            averageFilesPerTest: Math.round(coverageStats.averageFilesPerTest * 100) / 100,
            lastUpdated: new Date(coverageStats.lastUpdated).toISOString()
          },
          fallbackStrategy: coverageAnalysis.fallbackStrategy
        }
      };

      this.logger.info(`Analysis completed in ${analysisTime}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Test Impact Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Run Test Impact Analysis (traditional dependency-based)
   */
  async analyze(options: ChangeDetectionOptions = {}): Promise<TIAResult> {
    const startTime = Date.now();
    this.logger.info('Starting Test Impact Analysis...');

    try {
      // Step 1: Detect changes
      this.logger.info('Detecting file changes...');
      const changedFiles = await this.changeDetector.detectChanges(options);
      this.logger.info(`Found ${changedFiles.length} changed files`);

      // Step 2: Find all source and test files
      this.logger.info('Discovering source and test files...');
      const allFiles = await this.findAllFiles();
      this.logger.info(`Found ${allFiles.length} total files`);

      // Step 3: Build dependency graph
      this.logger.info('Building dependency graph...');
      const dependencyGraph = await this.dependencyAnalyzer.buildGraph(allFiles);
      this.logger.info(`Built dependency graph with ${dependencyGraph.nodes.size} nodes`);

      // Step 4: Calculate affected tests
      this.logger.info('Calculating affected tests...');
      const affectedTests = this.calculateAffectedTests(changedFiles, dependencyGraph);
      this.logger.info(`Found ${affectedTests.length} affected tests`);

      const analysisTime = Date.now() - startTime;
      const currentCommit = await this.changeDetector.getCurrentCommit();

      const result: TIAResult = {
        changedFiles,
        affectedTests,
        totalTests: allFiles.filter(f => isTestFile(f)).length,
        metadata: {
          analysisTime,
          baseCommit: options.base || currentCommit || undefined,
          framework: 'core',
          config: this.config,
          usedCoverage: false
        }
      };

      this.logger.info(`Analysis completed in ${analysisTime}ms`);
      return result;

    } catch (error) {
      this.logger.error('Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Run tests using the appropriate adapter
   */
  async runTests(result: TIAResult, framework?: string): Promise<void> {
    if (result.affectedTests.length === 0) {
      this.logger.info('No affected tests to run');
      return;
    }

    // Auto-detect framework if not specified
    const detectedFramework = framework || await this.detectFramework();
    
    if (!detectedFramework) {
      throw new Error('No framework specified and auto-detection failed');
    }

    const adapter = this.adapters.get(detectedFramework);
    if (!adapter) {
      throw new Error(`No adapter found for framework: ${detectedFramework}`);
    }

    this.logger.info(`Running ${result.affectedTests.length} tests using ${detectedFramework}...`);
    
    const testFiles = result.affectedTests.map(t => t.path);
    const testResult = await adapter.runTests(testFiles, this.config);
    
    this.logger.info(`Tests completed: ${testResult.passed} passed, ${testResult.failed} failed, ${testResult.skipped} skipped`);
    
    if (!testResult.success) {
      throw new Error(`Tests failed: ${testResult.failed} test(s) failed`);
    }
  }

  /**
   * Watch for changes and run analysis automatically
   */
  async watch(
    callback: (result: TIAResult) => void,
    options: ChangeDetectionOptions = {}
  ): Promise<() => void> {
    this.logger.info('Starting watch mode...');
    
    return this.changeDetector.watchChanges(async (changes) => {
      if (changes.length > 0) {
        this.logger.info(`Detected ${changes.length} file changes, running analysis...`);
        try {
          const result = await this.analyze(options);
          callback(result);
        } catch (error) {
          this.logger.error('Watch analysis failed:', error);
        }
      }
    }, options);
  }

  /**
   * Find all source and test files
   */
  private async findAllFiles(): Promise<string[]> {
    const sourceExtensions = this.config.sourceExtensions || ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    const testExtensions = this.config.testExtensions || sourceExtensions;
    const ignorePatterns = this.config.ignorePatterns || ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'];

    const allExtensions = [...new Set([...sourceExtensions, ...testExtensions])];
    const patterns = allExtensions.map(ext => `**/*${ext}`);

    return findFiles(this.config.rootDir, patterns, ignorePatterns);
  }

  /**
   * Calculate which tests are affected by the changed files
   */
  private calculateAffectedTests(
    changedFiles: ChangedFile[], 
    dependencyGraph: DependencyGraph
  ): TestFile[] {
    const affectedTests: TestFile[] = [];
    const testFiles = new Set<string>();

    for (const changedFile of changedFiles) {
      const filePath = changedFile.path;

      // If the changed file is a test file itself
      if (isTestFile(filePath)) {
        testFiles.add(filePath);
        continue;
      }

      // Special handling for E2E tests (Cypress, Playwright)
      // E2E tests typically test the entire application, so any source change affects them
      if (this.isSourceFileChange(filePath)) {
        this.addE2ETests(testFiles, dependencyGraph);
      }

      // Find all dependents of the changed file
      const dependents = dependencyGraph.getDependents(
        filePath, 
        this.config.maxDepth || 10
      );
      // Add test files that depend on the changed file
      for (const dependent of dependents) {
        if (isTestFile(dependent)) {
          testFiles.add(dependent);
        }
      }

      // Direct dependency analysis
      for (const [testPath, node] of dependencyGraph.nodes) {
        if (!node.isTest) continue;

        const dependencies = dependencyGraph.getDependencies(
          testPath, 
          this.config.maxDepth || 10
        );

        if (dependencies.includes(filePath)) {
          testFiles.add(testPath);
        }
      }
    }

    // Convert to TestFile objects with metadata
    for (const testPath of testFiles) {
      const reason = this.determineTestImpactReason(testPath, changedFiles, dependencyGraph);
      const priority = this.calculateTestPriority(testPath, changedFiles, dependencyGraph);

      affectedTests.push({
        path: testPath,
        reason,
        priority,
        metadata: {
          dependencies: dependencyGraph.getDependencies(testPath),
          isDirectlyChanged: changedFiles.some(cf => cf.path === testPath)
        }
      });
    }

    // Sort by priority (highest first)
    return affectedTests.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Determine why a test should be run
   */
  private determineTestImpactReason(
    testPath: string, 
    changedFiles: ChangedFile[], 
    dependencyGraph: DependencyGraph
  ): TestFile['reason'] {
    // Check if the test file itself was changed
    if (changedFiles.some(cf => cf.path === testPath)) {
      return 'test-file-changed';
    }

    // Check for direct dependencies
    const dependencies = dependencyGraph.getDependencies(testPath, 1); // Direct only
    for (const changedFile of changedFiles) {
      if (dependencies.includes(changedFile.path)) {
        return 'direct-dependency';
      }
    }

    // Check for indirect dependencies
    const allDependencies = dependencyGraph.getDependencies(testPath);
    for (const changedFile of changedFiles) {
      if (allDependencies.includes(changedFile.path)) {
        return 'indirect-dependency';
      }
    }

    return 'forced';
  }

  /**
   * Calculate priority score for test execution
   */
  private calculateTestPriority(
    testPath: string, 
    changedFiles: ChangedFile[], 
    dependencyGraph: DependencyGraph
  ): number {
    let priority = 50; // Base priority

    // Higher priority if test file itself changed
    if (changedFiles.some(cf => cf.path === testPath)) {
      priority += 50;
    }

    // Higher priority for direct dependencies
    const directDeps = dependencyGraph.getDependencies(testPath, 1);
    const hasDirectDep = changedFiles.some(cf => directDeps.includes(cf.path));
    if (hasDirectDep) {
      priority += 30;
    }

    // Lower priority for deeper dependencies
    const allDeps = dependencyGraph.getDependencies(testPath);
    const indirectDepCount = allDeps.length - directDeps.length;
    priority -= Math.min(indirectDepCount * 2, 20);

    // Higher priority for integration tests (typically in specific directories)
    if (testPath.includes('/integration/') || testPath.includes('/e2e/')) {
      priority += 20;
    }

    return Math.max(priority, 1);
  }

  /**
   * Auto-detect the testing framework
   */
  private async detectFramework(): Promise<string | null> {
    for (const [name, adapter] of this.adapters) {
      try {
        if (await adapter.detect(this.config.rootDir)) {
          return name;
        }
      } catch (error) {
        this.logger.debug(`Framework detection failed for ${name}:`, error);
      }
    }
    return null;
  }

  /**
   * Check if a file change is a source file that could affect E2E tests
   */
  private isSourceFileChange(filePath: string): boolean {
    const sourceExtensions = this.config.sourceExtensions || ['.js', '.ts', '.tsx', '.jsx', '.html', '.css'];
    const extension = path.extname(filePath).toLowerCase();
    
    return sourceExtensions.includes(extension) && 
           !isTestFile(filePath) &&
           !filePath.includes('node_modules') &&
           !filePath.includes('.git/');
  }

  /**
   * Add E2E tests (Cypress, Playwright) to the affected tests list
   * E2E tests test the entire application, so they're affected by most source changes
   */
  private addE2ETests(testFiles: Set<string>, dependencyGraph: DependencyGraph): void {
    for (const [testPath, node] of dependencyGraph.nodes) {
      if (node.isTest && this.isE2ETest(testPath)) {
        testFiles.add(testPath);
      }
    }
  }

  /**
   * Check if a test file is an E2E test (Cypress or Playwright)
   */
  private isE2ETest(filePath: string): boolean {
    return filePath.includes('/cypress/') || 
           filePath.includes('/e2e/') ||
           filePath.includes('.cy.') ||
           filePath.includes('.spec.') && (filePath.includes('/playwright/') || filePath.includes('/tests/'));
  }

  /**
   * Normalize and validate configuration
   */
  private normalizeConfig(config: TIAConfig): TIAConfig {
    const defaultConfig: Partial<TIAConfig> = {
      ignorePatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**'],
      sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      testExtensions: ['.test.ts', '.test.tsx', '.test.js', '.test.jsx', '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx'],
      maxDepth: 10,
      includeIndirect: true
    };

    return deepMerge(defaultConfig, config) as TIAConfig;
  }

  /**
   * Store coverage data for a test
   */
  async storeCoverageData(testFile: string, executedFiles: string[], framework: string, metadata?: any): Promise<void> {
    const coverageData = {
      testFile,
      executedFiles,
      timestamp: Date.now(),
      framework,
      metadata
    };
    
    await this.coverageAnalyzer['coverageStorage'].storeCoverageData(coverageData);
    this.logger.debug(`Stored coverage data for ${testFile}`);
  }

  /**
   * Get coverage statistics
   */
  async getCoverageStats() {
    return this.coverageAnalyzer.getCoverageStats();
  }

  /**
   * Clear all coverage data
   */
  async clearCoverageData(): Promise<void> {
    await this.coverageAnalyzer.clearCoverageData();
    this.logger.info('Cleared all coverage data');
  }
}
