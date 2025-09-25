/**
 * CLI utility functions
 */

import chalk from 'chalk';

/**
 * Create a simple table for console output
 */
export function createTable(headers: string[]): any {
  // Simple table implementation
  const table = {
    headers,
    rows: [] as string[][],
    push(row: string[]) {
      this.rows.push(row);
    },
    toString() {
      if (this.rows.length === 0) return '';
      
      // Calculate column widths
      const widths = this.headers.map((header, i) => {
        const headerWidth = stripAnsi(header).length;
        const maxRowWidth = Math.max(...this.rows.map(row => stripAnsi(row[i] || '').length));
        return Math.max(headerWidth, maxRowWidth);
      });
      
      // Create separator
      const separator = widths.map(w => '─'.repeat(w + 2)).join('┼');
      const topBorder = '┌' + separator.replace(/┼/g, '┬') + '┐';
      const bottomBorder = '└' + separator.replace(/┼/g, '┴') + '┘';
      const headerSeparator = '├' + separator + '┤';
      
      // Format rows
      const formatRow = (row: string[]) => {
        return '│ ' + row.map((cell, i) => {
          const stripped = stripAnsi(cell);
          const padding = ' '.repeat(widths[i] - stripped.length);
          return cell + padding;
        }).join(' │ ') + ' │';
      };
      
      const lines = [
        topBorder,
        formatRow(this.headers.map(h => chalk.bold(h))),
        headerSeparator,
        ...this.rows.map(formatRow),
        bottomBorder
      ];
      
      return lines.join('\n');
    }
  };
  
  return table;
}

/**
 * Strip ANSI color codes from string
 */
function stripAnsi(str: string): string {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Format test impact reason with colors
 */
export function formatTestReason(reason: string): string {
  switch (reason) {
    case 'direct-dependency':
      return chalk.green('🔗 Direct dependency');
    case 'indirect-dependency':
      return chalk.yellow('🔗 Indirect dependency');
    case 'test-file-changed':
      return chalk.blue('📝 Test file changed');
    case 'config-changed':
      return chalk.red('⚙️  Config changed');
    case 'forced':
      return chalk.magenta('🔒 Forced');
    case 'new-test':
      return chalk.cyan('✨ New test');
    case 'coverage-direct':
      return chalk.green('📊 Coverage');
    default:
      return chalk.gray('❓ Unknown');
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Create a progress bar
 */
export function createProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(percentage * 100);
  
  return `${bar} ${percent}%`;
}

/**
 * Format test results summary
 */
export function formatTestSummary(passed: number, failed: number, skipped: number): string {
  const total = passed + failed + skipped;
  const parts = [];
  
  if (passed > 0) parts.push(chalk.green(`${passed} passed`));
  if (failed > 0) parts.push(chalk.red(`${failed} failed`));
  if (skipped > 0) parts.push(chalk.yellow(`${skipped} skipped`));
  
  return `${parts.join(', ')} (${total} total)`;
}

/**
 * Create a spinner-like loading indicator
 */
export function createSpinner(text: string): {
  start(): void;
  stop(): void;
  succeed(text?: string): void;
  fail(text?: string): void;
} {
  let interval: NodeJS.Timeout;
  let isSpinning = false;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  
  return {
    start() {
      if (isSpinning) return;
      isSpinning = true;
      
      process.stdout.write('\x1B[?25l'); // Hide cursor
      
      interval = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(frames[frameIndex])} ${text}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
    },
    
    stop() {
      if (!isSpinning) return;
      isSpinning = false;
      
      clearInterval(interval);
      process.stdout.write('\r\x1B[K'); // Clear line
      process.stdout.write('\x1B[?25h'); // Show cursor
    },
    
    succeed(successText?: string) {
      this.stop();
      console.log(chalk.green('✓'), successText || text);
    },
    
    fail(errorText?: string) {
      this.stop();
      console.log(chalk.red('✗'), errorText || text);
    }
  };
}

/**
 * Pluralize a word based on count
 */
export function pluralize(word: string, count: number, suffix: string = 's'): string {
  return count === 1 ? word : word + suffix;
}

/**
 * Parse comma-separated values
 */
export function parseCommaSeparated(value: string): string[] {
  return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
}

/**
 * Validate file extension format
 */
export function validateExtension(ext: string): boolean {
  return /^\.[a-zA-Z0-9]+$/.test(ext);
}

/**
 * Get relative path for display
 */
export function getDisplayPath(filePath: string, rootDir: string = process.cwd()): string {
  const relativePath = filePath.startsWith(rootDir) 
    ? filePath.slice(rootDir.length + 1)
    : filePath;
  
  return relativePath || filePath;
}
