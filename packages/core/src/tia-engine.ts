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

/**
 * Core Test Impact Analysis Engine
 */
export class TIAEngine {
  private config: TIAConfig;
  private dependencyAnalyzer: DependencyAnalyzer;
  private changeDetector: ChangeDetector;
  private logger: Logger;
  private adapters: Map<string, TIAAdapter> = new Map();

  constructor(config: TIAConfig) {
    this.config = this.normalizeConfig(config);
    this.dependencyAnalyzer = new DependencyAnalyzer(this.config);
    this.changeDetector = new ChangeDetector(this.config.rootDir);
    this.logger = createLogger('info');
  }

  /**
   * Register a framework adapter
   */
  registerAdapter(adapter: TIAAdapter): void {
    this.adapters.set(adapter.name, adapter);
    this.logger.debug(`Registered adapter: ${adapter.name}`);
  }

  /**
   * Run Test Impact Analysis
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
          baseCommit: options.base || currentCommit || 'HEAD',
          framework: 'core',
          config: this.config
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
}
