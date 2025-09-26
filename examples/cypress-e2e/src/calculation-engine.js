/**
 * Calculation-specific functionality
 * This module should ONLY be used by calculator tests
 */

export class CalculationEngine {
    constructor() {
        this.precision = 10;
        this.history = [];
        this.memory = 0;
        this.lastOperation = null;
        this.constants = {
            PI: Math.PI,
            E: Math.E,
            GOLDEN_RATIO: (1 + Math.sqrt(5)) / 2
        };
    }

    // Advanced calculation methods
    performCalculation(num1, operator, num2) {
        const a = parseFloat(num1);
        const b = parseFloat(num2);
        let result;

        switch (operator) {
            case '+':
                result = this.add(a, b);
                break;
            case '-':
                result = this.subtract(a, b);
                break;
            case '*':
                result = this.multiply(a, b);
                break;
            case '/':
                result = this.divide(a, b);
                break;
            case '^':
                result = this.power(a, b);
                break;
            case '%':
                result = this.modulo(a, b);
                break;
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }

        const operation = {
            operand1: a,
            operator,
            operand2: b,
            result,
            timestamp: Date.now()
        };

        this.addToHistory(operation);
        this.lastOperation = operation;
        
        return this.roundToPrecision(result);
    }

    add(a, b) {
        // Enhanced addition with logging for TIA line-level demo (v2)
        const result = a + b;
        console.log(`Addition: ${a} + ${b} = ${result}`);
        return result;
    }

    subtract(a, b) {
        return a - b;
    }

    multiply(a, b) {
        return a * b;
    }

    divide(a, b) {
        if (b === 0) {
            throw new Error('Cannot divide by zero');
        }
        return a / b;
    }

    power(base, exponent) {
        return Math.pow(base, exponent);
    }

    modulo(a, b) {
        if (b === 0) {
            throw new Error('Modulo by zero is not allowed');
        }
        return a % b;
    }

    roundToPrecision(value) {
        return Math.round(value * Math.pow(10, this.precision)) / Math.pow(10, this.precision);
    }

    addToHistory(operation) {
        this.history.push(operation);
        // Keep only last 50 operations
        if (this.history.length > 50) {
            this.history = this.history.slice(-50);
        }
    }

    getHistory() {
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
    }

    getLastOperation() {
        return this.lastOperation;
    }

    // Memory functions
    memoryStore(value) {
        this.memory = parseFloat(value) || 0;
    }

    memoryRecall() {
        return this.memory;
    }

    memoryClear() {
        this.memory = 0;
    }

    memoryAdd(value) {
        this.memory += parseFloat(value) || 0;
    }

    memorySubtract(value) {
        this.memory -= parseFloat(value) || 0;
    }

    // Statistical functions
    calculateStatistics(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) {
            return null;
        }

        const sum = numbers.reduce((acc, num) => acc + parseFloat(num), 0);
        const mean = sum / numbers.length;
        const sortedNumbers = numbers.map(n => parseFloat(n)).sort((a, b) => a - b);
        const median = sortedNumbers.length % 2 === 0
            ? (sortedNumbers[sortedNumbers.length / 2 - 1] + sortedNumbers[sortedNumbers.length / 2]) / 2
            : sortedNumbers[Math.floor(sortedNumbers.length / 2)];

        return {
            count: numbers.length,
            sum: this.roundToPrecision(sum),
            mean: this.roundToPrecision(mean),
            median: this.roundToPrecision(median),
            min: Math.min(...sortedNumbers),
            max: Math.max(...sortedNumbers)
        };
    }

    // Validation functions
    validateInput(input) {
        if (typeof input !== 'string' && typeof input !== 'number') {
            return { valid: false, error: 'Input must be a string or number' };
        }

        const numValue = parseFloat(input);
        if (isNaN(numValue)) {
            return { valid: false, error: 'Input is not a valid number' };
        }

        if (!isFinite(numValue)) {
            return { valid: false, error: 'Input must be a finite number' };
        }

        return { valid: true, value: numValue };
    }

    formatResult(result) {
        if (typeof result !== 'number') {
            return 'Error';
        }

        if (!isFinite(result)) {
            return 'Infinity';
        }

        // Format large numbers with scientific notation
        if (Math.abs(result) >= 1e15) {
            return result.toExponential(this.precision);
        }

        // Format very small numbers with scientific notation
        if (Math.abs(result) < 1e-10 && result !== 0) {
            return result.toExponential(this.precision);
        }

        return this.roundToPrecision(result).toString();
    }
}

// Calculation-specific utility functions
export function isValidOperator(operator) {
    return ['+', '-', '*', '/', '^', '%'].includes(operator);
}

export function getOperatorPrecedence(operator) {
    switch (operator) {
        case '+':
        case '-':
            return 1;
        case '*':
        case '/':
        case '%':
            return 2;
        case '^':
            return 3;
        default:
            return 0;
    }
}

export function formatCalculationExpression(num1, operator, num2, result) {
    return `${num1} ${operator} ${num2} = ${result}`;
}
