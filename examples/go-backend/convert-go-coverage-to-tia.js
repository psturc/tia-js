#!/usr/bin/env node

/**
 * Convert Go coverage profile to proper TIA JSON format
 * This script properly maps Go coverage blocks to line numbers
 */

const fs = require('fs');
const path = require('path');

function parseGoCoverageProfile(profileFile) {
    const content = fs.readFileSync(profileFile, 'utf8');
    const lines = content.split('\n');
    
    // Skip mode line
    const coverageLines = lines.slice(1).filter(line => line.trim());
    
    const blocks = [];
    
    for (const line of coverageLines) {
        // Parse: filename:startLine.startCol,endLine.endCol numStmt count
        const parts = line.split(' ');
        if (parts.length !== 3) continue;
        
        const [fileAndPos, numStmt, count] = parts;
        const colonIdx = fileAndPos.lastIndexOf(':');
        if (colonIdx === -1) continue;
        
        const fileName = fileAndPos.substring(0, colonIdx);
        const position = fileAndPos.substring(colonIdx + 1);
        
        // Parse position: startLine.startCol,endLine.endCol
        const [start, end] = position.split(',');
        const [startLine, startCol] = start.split('.').map(Number);
        const [endLine, endCol] = end.split('.').map(Number);
        
        blocks.push({
            fileName,
            startLine,
            startCol,
            endLine,
            endCol,
            numStmt: parseInt(numStmt),
            count: parseInt(count)
        });
    }
    
    return blocks;
}

function convertToTIAFormat(blocks, mainFileName = 'main.go') {
    const statementMap = {};
    const statements = {};
    
    // Group blocks by file
    const fileBlocks = blocks.filter(block => block.fileName.endsWith(mainFileName));
    
    fileBlocks.forEach((block, index) => {
        const stmtId = index.toString();
        
        // Create statement map entry
        statementMap[stmtId] = {
            start: { line: block.startLine, column: block.startCol },
            end: { line: block.endLine, column: block.endCol }
        };
        
        // Set statement count
        statements[stmtId] = block.count;
    });
    
    return {
        [mainFileName]: {
            _coverageSchema: "go-coverage-tia-1.0.0",
            path: mainFileName,
            statementMap: statementMap,
            s: statements,
            f: {},
            fnMap: {},
            b: {},
            branchMap: {}
        }
    };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('Usage: node convert-go-coverage-to-tia.js <input-profile> <output-json> <test-name>');
        process.exit(1);
    }
    
    const [inputProfile, outputJson, testName] = args;
    
    try {
        console.log(`[TIA-Go Converter] Converting ${inputProfile} to TIA format...`);
        
        const blocks = parseGoCoverageProfile(inputProfile);
        const tiaData = convertToTIAFormat(blocks);
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputJson);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write TIA format
        fs.writeFileSync(outputJson, JSON.stringify(tiaData, null, 2));
        
        console.log(`[TIA-Go Converter] Created TIA coverage file: ${outputJson}`);
        console.log(`[TIA-Go Converter] Statements: ${Object.keys(tiaData['main.go'].s).length}`);
        console.log(`[TIA-Go Converter] Covered statements: ${Object.values(tiaData['main.go'].s).filter(count => count > 0).length}`);
        
    } catch (error) {
        console.error(`[TIA-Go Converter] Error: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { parseGoCoverageProfile, convertToTIAFormat };

