
// TIA Coverage Instrumentation
if (typeof window !== 'undefined') {
    window.__coverage__ = window.__coverage__ || {};
    window.__coverage__['/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js'] = {
        path: '/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js',
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
// Calculator functionality
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 2); class Calculator {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 3);     constructor() {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 4);         this.history = [];
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 5);         this.initializeEventListeners();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 6);     }

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 8);     initializeEventListeners() {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 9);         document.getElementById('calculate').addEventListener('click', () => {
            
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 11);             this.calculate();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 12);         });

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 14);         document.getElementById('clear-history').addEventListener('click', () => {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 15);             this.clearHistory();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 16);         });

        // Allow Enter key to calculate
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 19);         document.addEventListener('keypress', (e) => {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 20);             if (e.key === 'Enter') {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 21);                 this.calculate();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 22);             }
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 23);         });
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 24);     }

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 26);     calculate() {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 27);         const num1 = parseFloat(document.getElementById('num1').value);
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 28);         const num2 = parseFloat(document.getElementById('num2').value);
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 29);         const operation = document.getElementById('operation').value;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 30);         const resultElement = document.getElementById('result');

        // Validation
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 33);         if (isNaN(num1) || isNaN(num2)) {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 34);             resultElement.textContent = 'Please enter valid numbers';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 35);             resultElement.style.color = 'red';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 36);             return;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 37);         }

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 39);         let result;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 40);         let operationSymbol;

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 42);         switch (operation) {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 43);         case 'add':
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 44);             result = num1 + num2;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 45);             operationSymbol = '+';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 46);             console.log('Addition performed:', result);
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 47);                 break;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 48);             case 'subtract':
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 49);                 result = num1 - num2;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 50);                 operationSymbol = '-';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 51);                 break;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 52);             case 'multiply':
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 53);                 result = num1 * num2;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 54);                 operationSymbol = '×';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 55);                 break;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 56);             case 'divide':
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 57);                 if (num2 === 0) {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 58);                     resultElement.textContent = 'Cannot divide by zero';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 59);                     resultElement.style.color = 'red';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 60);                     return;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 61);                 }
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 62);                 result = num1 / num2;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 63);                 operationSymbol = '÷';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 64);                 break;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 65);             default:
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 66);                 resultElement.textContent = 'Invalid operation';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 67);                 resultElement.style.color = 'red';
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 68);                 return;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 69);         }

        // Display result
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 72);         resultElement.textContent = result;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 73);         resultElement.style.color = 'black';

        // Add to history
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 76);         const historyEntry = `${num1} ${operationSymbol} ${num2} = ${result}`;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 77);         this.addToHistory(historyEntry);
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 78);     }

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 80);     addToHistory(entry) {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 81);         this.history.unshift(entry); // Add to beginning
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 82);         this.updateHistoryDisplay();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 83);     }

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 85);     clearHistory() {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 86);         this.history = [];
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 87);         this.updateHistoryDisplay();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 88);     }

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 90);     updateHistoryDisplay() {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 91);         const historyList = document.getElementById('history-list');
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 92);         historyList.innerHTML = '';

window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 94);         this.history.forEach(entry => {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 95);             const li = document.createElement('li');
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 96);             li.textContent = entry;
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 97);             historyList.appendChild(li);
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 98);         });
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 99);     }
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 100); }

// Initialize calculator when page loads
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 103); document.addEventListener('DOMContentLoaded', () => {
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 104);     new Calculator();
window.__coverageTrack && window.__coverageTrack('/Users/psturc/dev/tia-js/examples/cypress-e2e/src/calculator.js', 105); });

