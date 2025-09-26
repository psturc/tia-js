/**
 * Debug the line-level parsing
 */

import { execSync } from 'child_process';

function parseDiffForLineNumbers(diffOutput) {
  const lines = [];
  const diffLines = diffOutput.split('\n');
  
  console.log('=== DIFF OUTPUT ===');
  console.log(diffOutput);
  console.log('=== PARSING ===');

  for (const line of diffLines) {
    console.log(`Checking line: "${line}"`);
    
    // Look for hunk headers like "@@ -65 +65 @@" or "@@ -10,3 +10,4 @@"
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    
    if (hunkMatch) {
      console.log('Found hunk match:', hunkMatch);
      const startLine = parseInt(hunkMatch[3]); // Start line in new file
      const lineCount = parseInt(hunkMatch[4]) || 1; // Number of lines, default 1
      
      console.log(`Start line: ${startLine}, Count: ${lineCount}`);
      
      // Add all lines in this hunk
      for (let i = 0; i < lineCount; i++) {
        lines.push(startLine + i);
      }
    }
  }

  console.log('Parsed lines:', lines);
  return [...new Set(lines)].sort((a, b) => a - b); // Remove duplicates and sort
}

try {
  const diffOutput = execSync('git diff --unified=0 HEAD "src/calculation-engine.js"', { 
    cwd: process.cwd(), 
    encoding: 'utf-8' 
  });
  
  const changedLines = parseDiffForLineNumbers(diffOutput);
  console.log('\n=== FINAL RESULT ===');
  console.log('Changed lines:', changedLines);
  
} catch (error) {
  console.error('Error:', error.message);
}
