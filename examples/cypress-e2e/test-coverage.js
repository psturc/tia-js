/**
 * Test script to verify coverage instrumentation is working
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCoverage() {
  try {
    console.log('🧪 Testing webpack coverage instrumentation...\n');
    
    // Read the instrumented JavaScript
    const jsPath = path.join(__dirname, 'dist', 'calculator.js');
    const htmlPath = path.join(__dirname, 'dist', 'index.html');
    
    if (!fs.existsSync(jsPath)) {
      console.error('❌ Instrumented JS not found. Run: npm run build:coverage');
      process.exit(1);
    }
    
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Check if the JS is instrumented
    if (jsContent.includes('__coverage__')) {
      console.log('✅ JavaScript is properly instrumented with coverage');
    } else {
      console.log('❌ JavaScript is not instrumented');
      process.exit(1);
    }
    
    // Simulate browser environment
    const dom = new JSDOM(htmlContent, {
      runScripts: 'dangerously',
      resources: 'usable',
      beforeParse(window) {
        // Inject coverage collection
        window.__coverage__ = {};
      }
    });
    
    const { window } = dom;
    
    // Execute the instrumented JavaScript
    const script = window.document.createElement('script');
    script.textContent = jsContent;
    window.document.head.appendChild(script);
    
    // Simulate some calculator operations
    const calculator = window.calculator;
    if (calculator) {
      calculator.add(5, 3);
      calculator.subtract(10, 4);
    }
    
    // Check coverage data
    if (window.__coverage__ && Object.keys(window.__coverage__).length > 0) {
      console.log('✅ Coverage data collected!');
      console.log('📊 Coverage entries:', Object.keys(window.__coverage__).length);
      
      // Show which files were covered
      Object.keys(window.__coverage__).forEach(file => {
        console.log(`   📄 ${file}`);
      });
      
      console.log('\n🎯 Webpack-based instrumentation is working correctly!');
    } else {
      console.log('❌ No coverage data collected');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCoverage();
