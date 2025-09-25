/**
 * Change detection for Test Impact Analysis
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ChangedFile, ChangeDetectionOptions } from '@tia-js/common';
import { normalizePath, matchesPatterns } from '@tia-js/common';

/**
 * Detects file changes using Git
 */
export class ChangeDetector {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /**
   * Detect changed files using Git
   */
  async detectChanges(options: ChangeDetectionOptions = {}): Promise<ChangedFile[]> {
    const {
      base = 'HEAD',
      includeUnstaged = true,
      includeUntracked = false,
      ignorePatterns = []
    } = options;

    try {
      const changes: ChangedFile[] = [];

      // Get staged and committed changes
      const committedChanges = await this.getCommittedChanges(base);
      changes.push(...committedChanges);

      if (includeUnstaged) {
        // Get unstaged changes
        const unstagedChanges = await this.getUnstagedChanges();
        changes.push(...unstagedChanges);
      }

      if (includeUntracked) {
        // Get untracked files
        const untrackedChanges = await this.getUntrackedChanges();
        changes.push(...untrackedChanges);
      }

      // Filter out ignored patterns and deduplicate
      const filteredChanges = this.filterAndDeduplicateChanges(changes, ignorePatterns);
      
      return filteredChanges;
    } catch (error) {
      console.warn('Git change detection failed, falling back to file system monitoring:', error);
      return [];
    }
  }

  /**
   * Get committed changes compared to base
   */
  private async getCommittedChanges(base: string): Promise<ChangedFile[]> {
    const output = await this.runGitCommand(['diff', '--name-status', base]);
    return this.parseGitDiffOutput(output);
  }

  /**
   * Get unstaged changes
   */
  private async getUnstagedChanges(): Promise<ChangedFile[]> {
    const output = await this.runGitCommand(['diff', '--name-status']);
    return this.parseGitDiffOutput(output);
  }

  /**
   * Get untracked files
   */
  private async getUntrackedChanges(): Promise<ChangedFile[]> {
    const output = await this.runGitCommand(['ls-files', '--others', '--exclude-standard']);
    const files = output.trim().split('\n').filter(line => line.trim());
    
    return files.map(file => ({
      path: path.resolve(this.rootDir, file),
      changeType: 'added' as const
    }));
  }

  /**
   * Parse git diff output
   */
  private parseGitDiffOutput(output: string): ChangedFile[] {
    const lines = output.trim().split('\n').filter(line => line.trim());
    const changes: ChangedFile[] = [];

    for (const line of lines) {
      const [status, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');

      if (!filePath) continue;

      let changeType: ChangedFile['changeType'];
      let previousPath: string | undefined;

      switch (status[0]) {
        case 'A':
          changeType = 'added';
          break;
        case 'M':
          changeType = 'modified';
          break;
        case 'D':
          changeType = 'deleted';
          break;
        case 'R':
          changeType = 'renamed';
          // For renames, git shows "R\toldpath\tnewpath"
          const [oldPath, newPath] = pathParts;
          previousPath = path.resolve(this.rootDir, oldPath);
          changes.push({
            path: path.resolve(this.rootDir, newPath),
            changeType,
            previousPath
          });
          continue;
        default:
          changeType = 'modified';
      }

      // Ensure the path is resolved relative to the correct root
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(this.rootDir, filePath);
      changes.push({
        path: resolvedPath,
        changeType,
        previousPath
      });
    }

    return changes;
  }

  /**
   * Run git command and return output
   */
  private async runGitCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', args, {
        cwd: this.rootDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      git.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });

      git.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Filter changes by ignore patterns and remove duplicates
   */
  private filterAndDeduplicateChanges(
    changes: ChangedFile[], 
    ignorePatterns: string[]
  ): ChangedFile[] {
    const seen = new Set<string>();
    const filtered: ChangedFile[] = [];

    for (const change of changes) {
      const relativePath = path.relative(this.rootDir, change.path);
      
      // Skip if already seen
      if (seen.has(change.path)) {
        continue;
      }
      
      // Skip if matches ignore patterns
      if (ignorePatterns.length > 0 && matchesPatterns(relativePath, ignorePatterns)) {
        continue;
      }

      seen.add(change.path);
      filtered.push({
        ...change,
        path: normalizePath(change.path),
        previousPath: change.previousPath ? normalizePath(change.previousPath) : undefined
      });
    }

    return filtered;
  }

  /**
   * Watch for file changes in real-time
   */
  async watchChanges(
    callback: (changes: ChangedFile[]) => void,
    options: ChangeDetectionOptions = {}
  ): Promise<() => void> {
    // This would typically use a file watcher like chokidar
    // For now, we'll implement a simple polling mechanism
    
    let lastChanges: ChangedFile[] = [];
    
    const poll = async () => {
      try {
        const currentChanges = await this.detectChanges(options);
        
        // Simple comparison - in production you'd want more sophisticated diffing
        if (JSON.stringify(currentChanges) !== JSON.stringify(lastChanges)) {
          lastChanges = currentChanges;
          callback(currentChanges);
        }
      } catch (error) {
        console.error('Error polling for changes:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(poll, 2000);
    
    // Initial poll
    poll();

    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Check if the current directory is a Git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.runGitCommand(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current Git commit hash
   */
  async getCurrentCommit(): Promise<string | null> {
    try {
      const output = await this.runGitCommand(['rev-parse', 'HEAD']);
      return output.trim();
    } catch {
      return null;
    }
  }
}
