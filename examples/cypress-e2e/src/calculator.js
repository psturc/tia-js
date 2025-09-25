// Calculator functionality
class Calculator {
    constructor() {
        this.history = [];
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

        // Validation
        if (isNaN(num1) || isNaN(num2)) {
            resultElement.textContent = 'Please enter valid numbers';
            resultElement.style.color = 'red';
            return;
        }

        let result;
        let operationSymbol;

        switch (operation) {
            case 'add':
                result = num1 + num2;
                operationSymbol = '+';
                break;
            case 'subtract':
                result = num1 - num2;
                operationSymbol = '-';
                break;
            case 'multiply':
                result = num1 * num2;
                operationSymbol = '×';
                break;
            case 'divide':
                if (num2 === 0) {
                    resultElement.textContent = 'Cannot divide by zero';
                    resultElement.style.color = 'red';
                    return;
                }
                result = num1 / num2;
                operationSymbol = '÷';
                break;
            default:
                resultElement.textContent = 'Invalid operation';
                resultElement.style.color = 'red';
                return;
        }

        // Display result
        resultElement.textContent = result;
        resultElement.style.color = 'black';

        // Add to history
        const historyEntry = `${num1} ${operationSymbol} ${num2} = ${result}`;
        this.addToHistory(historyEntry);
    }

    addToHistory(entry) {
        this.history.unshift(entry); // Add to beginning
        this.updateHistoryDisplay();
    }

    clearHistory() {
        this.history = [];
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        this.history.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = entry;
            historyList.appendChild(li);
        });
    }
}

// Initialize calculator when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Calculator();
});
