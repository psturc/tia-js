/**
 * Calculator class that uses math utilities
 */

import { add, subtract, multiply, divide } from './math';

export class Calculator {
  private history: string[] = [];

  add(a: number, b: number): number {
    const result = add(a, b);
    this.history.push(`${a} + ${b} = ${result}`);
    return result;
  }

  subtract(a: number, b: number): number {
    const result = subtract(a, b);
    this.history.push(`${a} - ${b} = ${result}`);
    return result;
  }

  multiply(a: number, b: number): number {
    const result = multiply(a, b);
    this.history.push(`${a} * ${b} = ${result}`);
    return result;
  }

  divide(a: number, b: number): number {
    const result = divide(a, b);
    this.history.push(`${a} / ${b} = ${result}`);
    return result;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
