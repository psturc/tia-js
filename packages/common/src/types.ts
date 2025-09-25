/**
 * Core types for Test Impact Analysis ecosystem
 */

/**
 * Represents a changed file with its change type
 */
export interface ChangedFile {
  /** Absolute path to the file */
  path: string;
  /** Type of change made to the file */
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Previous path for renamed files */
  previousPath?: string;
}

/**
 * Represents a test file that should be executed
 */
export interface TestFile {
  /** Absolute path to the test file */
  path: string;
  /** Reason why this test should be run */
  reason: TestImpactReason;
  /** Priority score (higher = more important) */
  priority: number;
  /** Framework-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Reasons why a test should be included in the impact analysis
 */
export type TestImpactReason = 
  | 'direct-dependency'      // Test directly imports/requires the changed file
  | 'indirect-dependency'    // Test has transitive dependency on changed file
  | 'test-file-changed'      // The test file itself was changed
  | 'config-changed'         // Configuration files changed (run all tests)
  | 'forced'                 // Manually forced to run
  | 'new-test'               // New test file added
  | 'coverage-direct';       // Test covered the changed file (coverage-based analysis)

/**
 * Configuration for Test Impact Analysis
 */
export interface TIAConfig {
  /** Root directory of the project */
  rootDir: string;
  /** Patterns to ignore when analyzing dependencies */
  ignorePatterns?: string[];
  /** File extensions to consider as source code */
  sourceExtensions?: string[];
  /** File extensions to consider as test files */
  testExtensions?: string[];
  /** Maximum depth for dependency analysis */
  maxDepth?: number;
  /** Whether to include indirect dependencies */
  includeIndirect?: boolean;
  /** Custom dependency resolver */
  customResolver?: (filePath: string) => string[];
  /** Framework-specific configuration */
  frameworks?: {
    cypress?: CypressConfig;
    playwright?: PlaywrightConfig;
    jest?: JestConfig;
  };
}

/**
 * Framework-specific configurations
 */
export interface CypressConfig {
  /** Cypress config file path */
  configFile?: string;
  /** Spec file patterns */
  specPattern?: string | string[];
  /** Support file path */
  supportFile?: string;
}

export interface PlaywrightConfig {
  /** Playwright config file path */
  configFile?: string;
  /** Test directory */
  testDir?: string;
  /** Test file patterns */
  testMatch?: string | string[];
}

export interface JestConfig {
  /** Jest config file path */
  configFile?: string;
  /** Test file patterns */
  testMatch?: string[];
  /** Setup files */
  setupFiles?: string[];
  /** Setup files after env */
  setupFilesAfterEnv?: string[];
}

/**
 * Result of Test Impact Analysis
 */
export interface TIAResult {
  /** Files that were changed */
  changedFiles: ChangedFile[];
  /** Tests that should be run */
  affectedTests: TestFile[];
  /** Total number of test files in the project */
  totalTests: number;
  /** Analysis metadata */
  metadata: {
    /** Time taken for analysis in milliseconds */
    analysisTime: number;
    /** Git commit hash or reference used */
    baseCommit?: string;
    /** Framework used for analysis */
    framework?: string;
    /** Configuration used */
    config?: TIAConfig;
    /** Whether coverage-based analysis was used */
    usedCoverage?: boolean;
    /** Coverage statistics if available */
    coverageStats?: {
      totalTests: number;
      totalSourceFiles: number;
      averageFilesPerTest: number;
      lastUpdated: string;
    };
    /** Fallback strategy used if coverage unavailable */
    fallbackStrategy?: 'heuristic' | 'all-tests' | 'none';
  };
}

/**
 * Interface for framework-specific adapters
 */
export interface TIAAdapter {
  /** Name of the framework */
  name: string;
  /** Detect if this adapter can handle the current project */
  detect(rootDir: string): Promise<boolean>;
  /** Find all test files for this framework */
  findTestFiles(config: TIAConfig): Promise<string[]>;
  /** Execute the selected tests */
  runTests(testFiles: string[], config: TIAConfig): Promise<TestRunResult>;
  /** Get framework-specific configuration */
  getConfig(rootDir: string): Promise<Partial<TIAConfig>>;
}

/**
 * Result of test execution
 */
export interface TestRunResult {
  /** Whether all tests passed */
  success: boolean;
  /** Number of tests that passed */
  passed: number;
  /** Number of tests that failed */
  failed: number;
  /** Number of tests that were skipped */
  skipped: number;
  /** Total execution time in milliseconds */
  duration: number;
  /** Detailed test results */
  tests: TestResult[];
}

/**
 * Individual test result
 */
export interface TestResult {
  /** Test file path */
  file: string;
  /** Test name or description */
  name: string;
  /** Test status */
  status: 'passed' | 'failed' | 'skipped';
  /** Execution time in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for change detection
 */
export interface ChangeDetectionOptions {
  /** Base commit/branch to compare against */
  base?: string;
  /** Include unstaged changes */
  includeUnstaged?: boolean;
  /** Include untracked files */
  includeUntracked?: boolean;
  /** Patterns to ignore */
  ignorePatterns?: string[];
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  /** File path */
  path: string;
  /** Direct dependencies */
  dependencies: string[];
  /** Files that depend on this file */
  dependents: string[];
  /** Whether this is a test file */
  isTest: boolean;
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  nodes: Map<string, DependencyNode>;
  /** Add a dependency relationship */
  addDependency(from: string, to: string): void;
  /** Get all dependencies of a file (direct and indirect) */
  getDependencies(filePath: string, maxDepth?: number): string[];
  /** Get all dependents of a file (direct and indirect) */
  getDependents(filePath: string, maxDepth?: number): string[];
}

/**
 * Coverage data for a single test execution
 */
export interface TestCoverageData {
  /** Test file path */
  testFile: string;
  /** Source files that were executed during this test */
  executedFiles: string[];
  /** Timestamp when coverage was collected */
  timestamp: number;
  /** Test framework used */
  framework: string;
  /** Additional metadata */
  metadata?: {
    /** Test duration */
    duration?: number;
    /** Test status */
    status?: 'passed' | 'failed' | 'skipped';
    /** Coverage percentage */
    coveragePercentage?: number;
    /** Individual test name (for per-test granularity) */
    testName?: string;
    /** Spec file path (for per-test granularity) */
    specFile?: string;
  };
}

/**
 * Coverage map for all tests
 */
export interface CoverageMap {
  /** Coverage data for each test */
  tests: Map<string, TestCoverageData>;
  /** Last updated timestamp */
  lastUpdated: number;
  /** Project root directory */
  rootDir: string;
}

/**
 * Coverage analysis result
 */
export interface CoverageAnalysisResult {
  /** Tests affected based on coverage */
  affectedTests: TestFile[];
  /** Coverage map used for analysis */
  coverageMap: CoverageMap;
  /** Whether coverage data was available */
  hasCoverageData: boolean;
  /** Fallback strategy used if no coverage */
  fallbackStrategy?: 'heuristic' | 'all-tests' | 'none';
}
