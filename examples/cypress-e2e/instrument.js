/**
 * Simple instrumentation script for coverage collection
 * This adds basic coverage tracking to our calculator.js
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src', 'calculator.js');
const instrumentedFile = path.join(__dirname, 'src', 'calculator.instrumented.js');

// Read the original file
const originalCode = fs.readFileSync(sourceFile, 'utf8');

// Add basic instrumentation wrapper
const instrumentedCode = `
// TIA Coverage Instrumentation
if (typeof window !== 'undefined') {
    window.__coverage__ = window.__coverage__ || {};
    window.__coverage__['${sourceFile}'] = {
        path: '${sourceFile}',
        functions: {},
        lines: {},
        statements: {},
        branches: {}
    };
    
    // Simple line tracking function
    window.__coverageTrack = function(file, line) {
        if (window.__coverage__[file] && window.__coverage__[file].lines) {
            window.__coverage__[file].lines[line] = (window.__coverage__[file].lines[line] || 0) + 1;
        }
    };
}

// Original code with line tracking
${originalCode.split('\n').map((line, index) => {
    const lineNum = index + 1;
    if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        return `window.__coverageTrack && window.__coverageTrack('${sourceFile}', ${lineNum}); ${line}`;
    }
    return line;
}).join('\n')}
`;

// Write the instrumented file
fs.writeFileSync(instrumentedFile, instrumentedCode);
console.log('✅ Instrumented calculator.js for coverage collection');
