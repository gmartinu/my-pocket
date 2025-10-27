import { Parser } from 'expr-eval';
import { Despesa, Cartao, Compra } from '../types/month';

// Create a parser instance for evaluating expressions
const parser = new Parser();

/**
 * Safely evaluates a mathematical formula string
 * Supports Brazilian decimal format (comma as decimal separator)
 * @param valor - Can be a number or a string formula like "100+50" or "184,28"
 * @returns The calculated number result
 */
export function evaluateFormula(valor: string | number): number {
  // If it's already a number, return it
  if (typeof valor === 'number') {
    return valor;
  }

  // If it's an empty string, return 0
  if (!valor || valor.trim() === '') {
    return 0;
  }

  try {
    // Normalize Brazilian format to US format
    // Replace comma (decimal separator) with dot
    // This handles cases like "184,28" or "100,5"
    let normalized = String(valor).trim();

    // Check if there are both dots and commas
    const hasDots = normalized.includes('.');
    const hasCommas = normalized.includes(',');

    if (hasDots && hasCommas) {
      // Format like "1.000,50" - remove dots (thousand separator), replace comma with dot
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasCommas) {
      // Format like "184,28" - just replace comma with dot
      normalized = normalized.replace(',', '.');
    }
    // If only dots, assume US format and leave as is

    // Use expr-eval to safely evaluate the expression
    // This library is React Native compatible and prevents code injection
    const result = parser.evaluate(normalized);

    // Ensure result is a finite number
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }

    return 0;
  } catch (error) {
    console.error('Error evaluating formula:', valor, error);
    return 0;
  }
}

/**
 * Calculate total planned expenses (all expenses, not just paid)
 * This is used for monthly projection and calculating "sobra"
 */
export function calculateTotalDespesas(despesas: Despesa[]): number {
  return despesas.reduce((sum, d) => sum + d.valorCalculado, 0);
}

/**
 * Calculate total of paid expenses only
 * This is used to track how much has actually been paid
 */
export function calculateTotalDespesasPagas(despesas: Despesa[]): number {
  return despesas
    .filter((d) => d.pago)
    .reduce((sum, d) => sum + d.valorCalculado, 0);
}

/**
 * Calculate total card payments
 */
export function calculateTotalCartoes(cartoes: Cartao[]): number {
  return cartoes.reduce((sum, cartao) => {
    const totalFatura = calculateTotalFatura(cartao.compras);
    return sum + totalFatura;
  }, 0);
}

/**
 * Calculate total invoice amount for a card
 */
export function calculateTotalFatura(compras: Compra[]): number {
  return compras
    .filter((c) => c.marcado)
    .reduce((sum, compra) => {
      // Calculate the current installment value
      const valorParcela = compra.valorTotal / compra.parcelasTotal;
      return sum + valorParcela;
    }, 0);
}

/**
 * Calculate remaining balance (sobra)
 */
export function calculateSobra(
  saldoInicial: number,
  totalDespesas: number,
  totalCartoes: number
): number {
  return saldoInicial - totalDespesas - totalCartoes;
}

/**
 * Calculate spending percentage
 */
export function calculateSpendingPercentage(
  totalDespesas: number,
  totalCartoes: number,
  saldoInicial: number
): number {
  if (saldoInicial === 0) return 0;
  return ((totalDespesas + totalCartoes) / saldoInicial) * 100;
}

/**
 * Format currency value to Brazilian Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
