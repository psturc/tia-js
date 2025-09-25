/**
 * Dependency analysis for Test Impact Analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DependencyGraph, DependencyNode, TIAConfig } from '@tia-js/common';
import { normalizePath, isTestFile } from '@tia-js/common';

/**
 * Analyzes JavaScript/TypeScript dependencies using AST parsing and import resolution
 */
export class DependencyAnalyzer {
  private config: TIAConfig;
  private graph: Map<string, DependencyNode> = new Map();

  constructor(config: TIAConfig) {
    this.config = config;
  }

  /**
   * Build dependency graph for the entire project
   */
  async buildGraph(files: string[]): Promise<DependencyGraph> {
    this.graph.clear();

    // Initialize nodes
    for (const file of files) {
      const normalizedPath = normalizePath(file);
      this.graph.set(normalizedPath, {
        path: normalizedPath,
        dependencies: [],
        dependents: [],
        isTest: isTestFile(normalizedPath)
      });
    }

    // Analyze dependencies for each file
    await Promise.all(files.map(file => this.analyzeFile(file)));

    // Build dependents relationships
    this.buildDependents();

    return this.createDependencyGraph();
  }

  /**
   * Analyze dependencies for a single file
   */
  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const dependencies = this.extractDependencies(content, filePath);
      
      const normalizedPath = normalizePath(filePath);
      const node = this.graph.get(normalizedPath);
      if (node) {
        node.dependencies = dependencies;
      }
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Could not analyze dependencies for ${filePath}:`, error);
    }
  }

  /**
   * Extract dependencies from file content using regex patterns
   * This is a simplified approach - in production, you'd want to use AST parsing
   */
  private extractDependencies(content: string, filePath: string): string[] {
    const dependencies: Set<string> = new Set();
    
    // Patterns for different import/require styles
    const patterns = [
      // ES6 imports
      /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      /import\s+['"`]([^'"`]+)['"`]/g,
      // CommonJS requires
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      // Dynamic imports
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      // TypeScript /// references
      /\/\/\/\s*<reference\s+path\s*=\s*['"`]([^'"`]+)['"`]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolvedPath = this.resolveImport(importPath, filePath);
        if (resolvedPath) {
          dependencies.add(resolvedPath);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImport(importPath: string, fromFile: string): string | null {
    // Skip node_modules imports unless configured otherwise
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    let resolvedPath: string;

    if (importPath.startsWith('.')) {
      // Relative import
      resolvedPath = path.resolve(fromDir, importPath);
    } else {
      // Absolute import
      resolvedPath = path.resolve(this.config.rootDir, importPath.startsWith('/') ? importPath.slice(1) : importPath);
    }

    // Try different file extensions
    const extensions = this.config.sourceExtensions || ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    
    for (const ext of extensions) {
      const fileWithExt = resolvedPath + ext;
      if (this.graph.has(normalizePath(fileWithExt))) {
        return normalizePath(fileWithExt);
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(resolvedPath, `index${ext}`);
      if (this.graph.has(normalizePath(indexFile))) {
        return normalizePath(indexFile);
      }
    }

    // Try the path as-is
    if (this.graph.has(normalizePath(resolvedPath))) {
      return normalizePath(resolvedPath);
    }

    return null;
  }

  /**
   * Build dependents relationships from dependencies
   */
  private buildDependents(): void {
    for (const [filePath, node] of this.graph) {
      for (const dependency of node.dependencies) {
        const depNode = this.graph.get(dependency);
        if (depNode && !depNode.dependents.includes(filePath)) {
          depNode.dependents.push(filePath);
        }
      }
    }
  }

  /**
   * Create the dependency graph interface
   */
  private createDependencyGraph(): DependencyGraph {
    const graph = this.graph;
    
    return {
      nodes: graph,
      
      addDependency(from: string, to: string): void {
        const fromNode = graph.get(from);
        const toNode = graph.get(to);
        
        if (fromNode && toNode) {
          if (!fromNode.dependencies.includes(to)) {
            fromNode.dependencies.push(to);
          }
          if (!toNode.dependents.includes(from)) {
            toNode.dependents.push(from);
          }
        }
      },
      
      getDependencies(filePath: string, maxDepth = Infinity): string[] {
        const visited = new Set<string>();
        const dependencies = new Set<string>();
        
        const traverse = (currentPath: string, depth: number) => {
          if (depth >= maxDepth || visited.has(currentPath)) {
            return;
          }
          
          visited.add(currentPath);
          const node = graph.get(currentPath);
          
          if (node) {
            for (const dependency of node.dependencies) {
              dependencies.add(dependency);
              traverse(dependency, depth + 1);
            }
          }
        };
        
        traverse(filePath, 0);
        return Array.from(dependencies);
      },
      
      getDependents(filePath: string, maxDepth = Infinity): string[] {
        const visited = new Set<string>();
        const dependents = new Set<string>();
        
        const traverse = (currentPath: string, depth: number) => {
          if (depth >= maxDepth || visited.has(currentPath)) {
            return;
          }
          
          visited.add(currentPath);
          const node = graph.get(currentPath);
          
          if (node) {
            for (const dependent of node.dependents) {
              dependents.add(dependent);
              traverse(dependent, depth + 1);
            }
          }
        };
        
        traverse(filePath, 0);
        return Array.from(dependents);
      }
    };
  }
}
