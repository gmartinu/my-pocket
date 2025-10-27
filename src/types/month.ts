import { Timestamp } from 'firebase/firestore';

// Compra (Purchase) - individual purchase on a card
export interface Compra {
  id: string;
  descricao: string;
  valorTotal: number;
  parcelaAtual: number;
  parcelasTotal: number;
  marcado: boolean;
}

// Cartao (Credit Card)
export interface Cartao {
  id: string;
  nome: string;
  limiteTotal: number;
  compras: Compra[];
  totalFatura: number; // Calculated field
}

// Despesa (Expense)
export interface Despesa {
  id: string;
  nome: string;
  valorPlanejado: string | number; // Can be "100+50" or 150
  valorCalculado: number; // Calculated from valorPlanejado
  pago: boolean;
  createdAt: Date | Timestamp;
}

// Month
export interface Month {
  id: string; // Format: "YYYY-MM" (e.g., "2025-10")
  nome: string; // "Outubro 2025"
  ano: number; // 2025
  mes: number; // 10
  saldoInicial: number;
  despesas: Despesa[];
  cartoes: Cartao[];
  totalDespesas: number; // Calculated
  totalCartoes: number; // Calculated
  sobra: number; // Calculated
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}
