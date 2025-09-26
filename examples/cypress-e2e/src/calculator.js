// Calculator functionality
import { formatNumber, isValidNumber, sanitizeInput } from './utils.js';
import { CalculationEngine, isValidOperator } from './calculation-engine.js';
class Calculator {
    constructor() {
        this.history = [];
        this.calculationEngine = new CalculationEngine();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('calculate').addEventListener('click', () => {
            
            this.calculate();
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            this.clearHistory();
        });

        // Allow Enter key to calculate
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.calculate();
            }
        });
    }

    calculate() {
        const num1 = parseFloat(document.getElementById('num1').value);
        const num2 = parseFloat(document.getElementById('num2').value);
        const operation = document.getElementById('operation').value;
        const resultElement = document.getElementById('result');

        // Enhanced TIA validation test using calculation engine
        if (!isValidNumber(num1) || !isValidNumber(num2)) {
            resultElement.textContent = 'Please enter valid numbers';
            resultElement.style.color = 'red';
            return;
        }

        // Map UI operation names to calculation engine operators
        const operatorMap = {
            'add': '+',
            'subtract': '-',
            'multiply': '*',
            'divide': '/'
        };

        const operator = operatorMap[operation];
        if (!isValidOperator(operator)) {
            resultElement.textContent = 'Invalid operation';
            resultElement.style.color = 'red';
            return;
        }

        try {
            // Use the calculation engine for advanced processing
            const result = this.calculationEngine.performCalculation(num1, operator, num2);
            const operationSymbol = operator;

            // Display the result
            const formattedResult = this.calculationEngine.formatResult(result);
            resultElement.textContent = formattedResult;
            resultElement.style.color = 'black';

            // Add to history using calculation engine (already handled by performCalculation)
            this.updateHistoryDisplay();
            
        } catch (error) {
            resultElement.textContent = `Error: ${error.message}`;
            resultElement.style.color = 'red';
            return;
        }
    }

    addToHistory(entry) {
        this.history.unshift(entry); // Add to beginning
        this.updateHistoryDisplay();
    }

    clearHistory() {
        this.calculationEngine.clearHistory();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        const engineHistory = this.calculationEngine.getHistory();
        engineHistory.forEach(operation => {
            const li = document.createElement('li');
            
            // Convert operators to display symbols that tests expect
            const displayOperator = operation.operator === '/' ? '÷' : 
                                   operation.operator === '*' ? '×' : 
                                   operation.operator;
            
            li.textContent = `${operation.operand1} ${displayOperator} ${operation.operand2} = ${operation.result}`;
            historyList.appendChild(li);
        });
    }
}

// Initialize calculator when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Calculator();
});

// TIA test: This comment was added to trigger change detection
