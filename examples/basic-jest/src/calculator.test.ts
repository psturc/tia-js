/**
 * Tests for Calculator class
 */

import { Calculator } from './calculator';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('basic operations', () => {
    it('should add numbers and record history', () => {
      const result = calculator.add(2, 3);
      expect(result).toBe(5);
      expect(calculator.getHistory()).toContain('2 + 3 = 5');
    });

    it('should subtract numbers and record history', () => {
      const result = calculator.subtract(5, 2);
      expect(result).toBe(3);
      expect(calculator.getHistory()).toContain('5 - 2 = 3');
    });

    it('should multiply numbers and record history', () => {
      const result = calculator.multiply(4, 3);
      expect(result).toBe(12);
      expect(calculator.getHistory()).toContain('4 * 3 = 12');
    });

    it('should divide numbers and record history', () => {
      const result = calculator.divide(10, 2);
      expect(result).toBe(5);
      expect(calculator.getHistory()).toContain('10 / 2 = 5');
    });
  });

  describe('history management', () => {
    it('should maintain operation history', () => {
      calculator.add(1, 2);
      calculator.multiply(3, 4);
      calculator.subtract(10, 5);

      const history = calculator.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0]).toBe('1 + 2 = 3');
      expect(history[1]).toBe('3 * 4 = 12');
      expect(history[2]).toBe('10 - 5 = 5');
    });

    it('should clear history', () => {
      calculator.add(1, 2);
      calculator.multiply(3, 4);
      
      expect(calculator.getHistory()).toHaveLength(2);
      
      calculator.clearHistory();
      expect(calculator.getHistory()).toHaveLength(0);
    });

    it('should return copy of history', () => {
      calculator.add(1, 2);
      const history1 = calculator.getHistory();
      const history2 = calculator.getHistory();
      
      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // Different references
    });
  });

  describe('error handling', () => {
    it('should propagate division by zero error', () => {
      expect(() => calculator.divide(5, 0)).toThrow('Division by zero');
    });
  });
});
