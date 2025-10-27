import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Month, Despesa, Cartao, Compra } from '../types/month';
import {
  getCurrentMonthId,
  formatMonthName,
  getNextMonthId,
  getPreviousMonthId,
  parseMonthId,
  isValidMonthId,
} from '../utils/dateUtils';
import {
  calculateTotalDespesas,
  calculateTotalCartoes,
  calculateSobra,
  calculateTotalFatura,
  evaluateFormula,
} from '../utils/calculations';

/**
 * Remove undefined values from objects before saving to Firestore
 * Firestore does not accept undefined values, so we need to remove them
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = (obj as any)[key];
        if (value !== undefined) {
          sanitized[key] = sanitizeForFirestore(value);
        }
      }
    }
    return sanitized as T;
  }

  return obj;
}

export interface UseMonthReturn {
  month: Month | null;
  loading: boolean;
  error: string | null;

  // Navigation
  currentMonthId: string;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToMonth: (monthId: string) => void;

  // Calculations
  recalculateTotals: () => Promise<void>;

  // Saldo inicial
  updateSaldoInicial: (saldo: number) => Promise<void>;

  // Despesas (foundation for Phase 4)
  addDespesa: (despesa: Omit<Despesa, 'id' | 'createdAt'>) => Promise<void>;
  updateDespesa: (id: string, data: Partial<Despesa>) => Promise<void>;
  deleteDespesa: (id: string) => Promise<void>;

  // Cartões (foundation for Phase 5)
  addCartao: (cartao: Omit<Cartao, 'id' | 'totalFatura'>) => Promise<void>;
  updateCartao: (id: string, data: Partial<Cartao>) => Promise<void>;
  deleteCartao: (id: string) => Promise<void>;

  // Compras (purchases on cards)
  addCompra: (cartaoId: string, compra: Omit<Compra, 'id'>) => Promise<void>;
  updateCompra: (cartaoId: string, compraId: string, data: Partial<Compra>) => Promise<void>;
  deleteCompra: (cartaoId: string, compraId: string) => Promise<void>;
}

export function useMonth(): UseMonthReturn {
  const { activeWorkspace } = useWorkspace();
  const [currentMonthId, setCurrentMonthId] = useState(getCurrentMonthId());
  const [month, setMonth] = useState<Month | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new month document
   */
  const createMonth = useCallback(
    async (monthId: string): Promise<Month> => {
      if (!activeWorkspace) throw new Error('No active workspace');

      const { year, month } = parseMonthId(monthId);
      const monthName = formatMonthName(monthId);

      const newMonth: Omit<Month, 'createdAt' | 'updatedAt'> = {
        id: monthId,
        nome: monthName,
        ano: year,
        mes: month,
        saldoInicial: 0,
        despesas: [],
        cartoes: [],
        totalDespesas: 0,
        totalCartoes: 0,
        sobra: 0,
      };

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${monthId}`);
      await setDoc(monthRef, {
        ...newMonth,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...newMonth,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    [activeWorkspace]
  );

  /**
   * Helper: Get list of future month IDs (up to 12 months ahead)
   */
  const getFutureMonthIds = useCallback((startMonthId: string, count: number = 12): string[] => {
    const monthIds: string[] = [];
    let currentId = getNextMonthId(startMonthId);

    for (let i = 0; i < count; i++) {
      monthIds.push(currentId);
      currentId = getNextMonthId(currentId);
    }

    return monthIds;
  }, []);

  /**
   * Helper: Copy recurring expenses to a future month
   * This ensures a month document exists and includes all active recurring expenses
   */
  const ensureMonthWithRecurringExpenses = useCallback(
    async (monthId: string, recurringExpenses: Despesa[]) => {
      if (!activeWorkspace) return;

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${monthId}`);
      const monthSnap = await getDoc(monthRef);

      if (!monthSnap.exists()) {
        // Create new month with recurring expenses
        const { year, month } = parseMonthId(monthId);
        const monthName = formatMonthName(monthId);

        const newMonth: Omit<Month, 'createdAt' | 'updatedAt'> = {
          id: monthId,
          nome: monthName,
          ano: year,
          mes: month,
          saldoInicial: 0,
          despesas: recurringExpenses.map(exp => ({
            ...exp,
            id: `desp_${Date.now()}_${Math.random()}`,
            pago: false, // Reset payment status for new month
            createdAt: new Date(),
          })),
          cartoes: [],
          totalDespesas: 0,
          totalCartoes: 0,
          sobra: 0,
        };

        await setDoc(monthRef, {
          ...newMonth,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Month exists, add missing recurring expenses
        const existingMonth = monthSnap.data() as Month;
        const existingDespesas = existingMonth.despesas || [];
        const existingDespesaIds = new Set(
          existingDespesas
            .filter(d => d.recurring?.isRecurring)
            .map(d => d.nome) // Match by nome since IDs are different per month
        );

        const newRecurringExpenses = recurringExpenses
          .filter(exp => !existingDespesaIds.has(exp.nome))
          .map(exp => ({
            ...exp,
            id: `desp_${Date.now()}_${Math.random()}`,
            pago: false,
            createdAt: new Date(),
          }));

        if (newRecurringExpenses.length > 0) {
          await updateDoc(monthRef, {
            despesas: sanitizeForFirestore([...existingDespesas, ...newRecurringExpenses]),
            updatedAt: serverTimestamp(),
          });
        }
      }
    },
    [activeWorkspace]
  );

  /**
   * Helper: Propagate recurring expense to future months
   */
  const propagateRecurringExpense = useCallback(
    async (despesa: Despesa, startMonthId: string) => {
      if (!despesa.recurring?.isRecurring) return;
      if (!activeWorkspace) return;

      const futureMonthIds = getFutureMonthIds(startMonthId, 12);

      for (const monthId of futureMonthIds) {
        await ensureMonthWithRecurringExpenses(monthId, [despesa]);
      }
    },
    [activeWorkspace, getFutureMonthIds, ensureMonthWithRecurringExpenses]
  );

  /**
   * Helper: Remove recurring expense from future months
   */
  const removeRecurringExpenseFromFuture = useCallback(
    async (despesaNome: string, startMonthId: string) => {
      if (!activeWorkspace) return;

      const futureMonthIds = getFutureMonthIds(startMonthId, 12);

      for (const monthId of futureMonthIds) {
        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${monthId}`);
        const monthSnap = await getDoc(monthRef);

        if (monthSnap.exists()) {
          const monthData = monthSnap.data() as Month;
          const updatedDespesas = (monthData.despesas || []).filter(
            d => d.nome !== despesaNome || !d.recurring?.isRecurring
          );

          if (updatedDespesas.length !== (monthData.despesas || []).length) {
            await updateDoc(monthRef, {
              despesas: sanitizeForFirestore(updatedDespesas),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    },
    [activeWorkspace, getFutureMonthIds]
  );

  /**
   * Helper: Update recurring expense in future months
   */
  const updateRecurringExpenseInFuture = useCallback(
    async (oldNome: string, updatedDespesa: Despesa, startMonthId: string) => {
      if (!updatedDespesa.recurring?.isRecurring) return;
      if (!activeWorkspace) return;

      const futureMonthIds = getFutureMonthIds(startMonthId, 12);

      for (const monthId of futureMonthIds) {
        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${monthId}`);
        const monthSnap = await getDoc(monthRef);

        if (monthSnap.exists()) {
          const monthData = monthSnap.data() as Month;
          const updatedDespesas = (monthData.despesas || []).map(d => {
            if (d.nome === oldNome && d.recurring?.isRecurring) {
              return {
                ...d,
                nome: updatedDespesa.nome,
                valorPlanejado: updatedDespesa.valorPlanejado,
                valorCalculado: updatedDespesa.valorCalculado,
                recurring: updatedDespesa.recurring,
              };
            }
            return d;
          });

          await updateDoc(monthRef, {
            despesas: sanitizeForFirestore(updatedDespesas),
            updatedAt: serverTimestamp(),
          });
        }
      }
    },
    [activeWorkspace, getFutureMonthIds]
  );

  /**
   * Load month from Firestore or create if doesn't exist
   * This function is now only used for creating a month when it doesn't exist
   * Real-time listening is handled by useEffect below
   */
  const loadMonth = useCallback(
    async (monthId: string) => {
      if (!activeWorkspace) {
        setMonth(null);
        setLoading(false);
        return;
      }

      if (!isValidMonthId(monthId)) {
        setError('Invalid month ID format');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${monthId}`);
        const monthSnap = await getDoc(monthRef);

        if (!monthSnap.exists()) {
          // Create month if it doesn't exist
          const newMonth = await createMonth(monthId);
          setMonth(newMonth);
        } else {
          const monthData = { id: monthSnap.id, ...monthSnap.data() } as Month;
          setMonth(monthData);
        }
      } catch (err: any) {
        console.error('Error loading month:', err);
        setError(err.message || 'Error loading month');
      } finally {
        setLoading(false);
      }
    },
    [activeWorkspace, createMonth]
  );

  /**
   * Recalculate all totals and update Firestore
   */
  const recalculateTotals = useCallback(async () => {
    if (!month || !activeWorkspace) return;

    // Get fresh data from state
    const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
    const monthSnap = await getDoc(monthRef);

    if (!monthSnap.exists()) return;

    const freshData = monthSnap.data();
    const totalDespesas = calculateTotalDespesas(freshData.despesas || []);
    const totalCartoes = calculateTotalCartoes(freshData.cartoes || []);
    const sobra = calculateSobra(freshData.saldoInicial || 0, totalDespesas, totalCartoes);

    // Update Firestore with calculated totals
    await updateDoc(monthRef, {
      totalDespesas,
      totalCartoes,
      sobra,
      updatedAt: serverTimestamp(),
    });

    // Update local state with all fresh data
    setMonth((prev) =>
      prev
        ? {
            ...prev,
            despesas: freshData.despesas || [],
            cartoes: freshData.cartoes || [],
            saldoInicial: freshData.saldoInicial || 0,
            totalDespesas,
            totalCartoes,
            sobra,
          }
        : null
    );
  }, [month, activeWorkspace]);

  /**
   * Update saldo inicial
   */
  const updateSaldoInicial = useCallback(
    async (saldo: number) => {
      if (!month || !activeWorkspace) return;

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await setDoc(
        monthRef,
        {
          saldoInicial: saldo,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMonth((prev) => (prev ? { ...prev, saldoInicial: saldo } : null));
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Add despesa
   */
  const addDespesa = useCallback(
    async (despesa: Omit<Despesa, 'id' | 'createdAt'>) => {
      if (!month || !activeWorkspace) return;

      const newDespesa: Despesa = {
        ...despesa,
        id: `desp_${Date.now()}`,
        valorCalculado: evaluateFormula(despesa.valorPlanejado),
        createdAt: new Date(),
      };

      const updatedDespesas = [...month.despesas, newDespesa];

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, despesas: updatedDespesas } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        despesas: sanitizeForFirestore(updatedDespesas),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();

      // Propagate to future months if recurring
      if (newDespesa.recurring?.isRecurring) {
        await propagateRecurringExpense(newDespesa, month.id);
      }
    },
    [month, activeWorkspace, recalculateTotals, propagateRecurringExpense]
  );

  /**
   * Update despesa
   */
  const updateDespesa = useCallback(
    async (id: string, data: Partial<Despesa>) => {
      if (!month || !activeWorkspace) return;

      // Find the original despesa to check recurring status
      const originalDespesa = month.despesas.find(d => d.id === id);
      if (!originalDespesa) return;

      const wasRecurring = originalDespesa.recurring?.isRecurring || false;
      const oldNome = originalDespesa.nome;

      const updatedDespesas = month.despesas.map((d) => {
        if (d.id === id) {
          const updated = { ...d, ...data };
          // Recalculate if valorPlanejado changed
          if (data.valorPlanejado !== undefined) {
            updated.valorCalculado = evaluateFormula(data.valorPlanejado);
          }
          return updated;
        }
        return d;
      });

      const updatedDespesa = updatedDespesas.find(d => d.id === id)!;
      const isNowRecurring = updatedDespesa.recurring?.isRecurring || false;

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, despesas: updatedDespesas } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        despesas: sanitizeForFirestore(updatedDespesas),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();

      // Handle recurring expense propagation
      if (wasRecurring && !isNowRecurring) {
        // Was recurring, now is not: remove from future months
        await removeRecurringExpenseFromFuture(oldNome, month.id);
      } else if (isNowRecurring) {
        if (wasRecurring) {
          // Still recurring: update future months
          await updateRecurringExpenseInFuture(oldNome, updatedDespesa, month.id);
        } else {
          // Newly marked as recurring: propagate to future
          await propagateRecurringExpense(updatedDespesa, month.id);
        }
      }
    },
    [month, activeWorkspace, recalculateTotals, propagateRecurringExpense, removeRecurringExpenseFromFuture, updateRecurringExpenseInFuture]
  );

  /**
   * Delete despesa
   */
  const deleteDespesa = useCallback(
    async (id: string) => {
      if (!month || !activeWorkspace) return;

      // Find the despesa to check if it's recurring
      const despesa = month.despesas.find(d => d.id === id);
      const wasRecurring = despesa?.recurring?.isRecurring || false;
      const despesaNome = despesa?.nome || '';

      const updatedDespesas = month.despesas.filter((d) => d.id !== id);

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, despesas: updatedDespesas } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        despesas: sanitizeForFirestore(updatedDespesas),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();

      // Remove from future months if it was recurring
      if (wasRecurring) {
        await removeRecurringExpenseFromFuture(despesaNome, month.id);
      }
    },
    [month, activeWorkspace, recalculateTotals, removeRecurringExpenseFromFuture]
  );

  /**
   * Helper: Generate month IDs for installments (including past if needed)
   */
  const getInstallmentMonthIds = useCallback((
    currentMonthId: string,
    parcelaAtual: number,
    parcelasTotal: number
  ): { monthId: string; parcelaNum: number }[] => {
    const result: { monthId: string; parcelaNum: number }[] = [];

    // Calculate how many months back to go (for retrospective installments)
    const monthsBack = parcelaAtual - 1;

    // Start from the first installment month
    let monthId = currentMonthId;
    for (let i = 0; i < monthsBack; i++) {
      monthId = getPreviousMonthId(monthId);
    }

    // Generate all installment months from first to last
    for (let parcela = 1; parcela <= parcelasTotal; parcela++) {
      result.push({ monthId, parcelaNum: parcela });
      if (parcela < parcelasTotal) {
        monthId = getNextMonthId(monthId);
      }
    }

    return result;
  }, []);

  /**
   * Helper: Create or update installments across multiple months
   */
  const propagateInstallments = useCallback(
    async (
      cartaoId: string,
      cartaoNome: string,
      compra: Omit<Compra, 'id'>,
      currentMonthId: string
    ) => {
      if (!activeWorkspace) return;

      const purchaseGroupId = `group_${Date.now()}`;
      const installmentMonths = getInstallmentMonthIds(
        currentMonthId,
        compra.parcelaAtual,
        compra.parcelasTotal
      );

      for (const { monthId, parcelaNum } of installmentMonths) {
        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${monthId}`);
        const monthSnap = await getDoc(monthRef);

        const installmentCompra: Compra = {
          ...compra,
          id: `comp_${Date.now()}_${parcelaNum}`,
          parcelaAtual: parcelaNum,
          purchaseGroupId,
          createdFromInstallment: true,
        };

        if (!monthSnap.exists()) {
          // Create new month with this installment
          const { year, month } = parseMonthId(monthId);
          const monthName = formatMonthName(monthId);

          const newCartao: Cartao = {
            id: cartaoId,
            nome: cartaoNome,
            limiteTotal: 0,
            compras: [installmentCompra],
            totalFatura: calculateTotalFatura([installmentCompra]),
          };

          const newMonth: Omit<Month, 'createdAt' | 'updatedAt'> = {
            id: monthId,
            nome: monthName,
            ano: year,
            mes: month,
            saldoInicial: 0,
            despesas: [],
            cartoes: [newCartao],
            totalDespesas: 0,
            totalCartoes: 0,
            sobra: 0,
          };

          await setDoc(monthRef, {
            ...newMonth,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          // Month exists, add or update cartao and compra
          const monthData = monthSnap.data() as Month;
          const existingCartoes = monthData.cartoes || [];

          const cartaoIndex = existingCartoes.findIndex(c => c.id === cartaoId);

          if (cartaoIndex >= 0) {
            // Cartao exists, add compra to it
            const updatedCartoes = [...existingCartoes];
            const updatedCompras = [...updatedCartoes[cartaoIndex].compras, installmentCompra];
            updatedCartoes[cartaoIndex] = {
              ...updatedCartoes[cartaoIndex],
              compras: updatedCompras,
              totalFatura: calculateTotalFatura(updatedCompras),
            };

            await updateDoc(monthRef, {
              cartoes: sanitizeForFirestore(updatedCartoes),
              updatedAt: serverTimestamp(),
            });
          } else {
            // Cartao doesn't exist in this month, create it
            const newCartao: Cartao = {
              id: cartaoId,
              nome: cartaoNome,
              limiteTotal: 0,
              compras: [installmentCompra],
              totalFatura: calculateTotalFatura([installmentCompra]),
            };

            await updateDoc(monthRef, {
              cartoes: sanitizeForFirestore([...existingCartoes, newCartao]),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    },
    [activeWorkspace, getInstallmentMonthIds]
  );

  /**
   * Helper: Delete all installments in a purchase group
   */
  const deleteInstallmentGroup = useCallback(
    async (purchaseGroupId: string, currentMonthId: string) => {
      if (!activeWorkspace) return;

      // We need to check 12 months back and 12 months forward
      const monthIds: string[] = [];
      let monthId = currentMonthId;

      // Add past months
      for (let i = 0; i < 12; i++) {
        monthId = getPreviousMonthId(monthId);
        monthIds.push(monthId);
      }

      // Add current month
      monthIds.push(currentMonthId);

      // Add future months
      monthId = currentMonthId;
      for (let i = 0; i < 12; i++) {
        monthId = getNextMonthId(monthId);
        monthIds.push(monthId);
      }

      // Delete from all months
      for (const mId of monthIds) {
        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${mId}`);
        const monthSnap = await getDoc(monthRef);

        if (monthSnap.exists()) {
          const monthData = monthSnap.data() as Month;
          const updatedCartoes = (monthData.cartoes || []).map(cartao => ({
            ...cartao,
            compras: cartao.compras.filter(c => c.purchaseGroupId !== purchaseGroupId),
            totalFatura: calculateTotalFatura(
              cartao.compras.filter(c => c.purchaseGroupId !== purchaseGroupId)
            ),
          }));

          await updateDoc(monthRef, {
            cartoes: sanitizeForFirestore(updatedCartoes),
            updatedAt: serverTimestamp(),
          });
        }
      }
    },
    [activeWorkspace]
  );

  /**
   * Add cartao
   */
  const addCartao = useCallback(
    async (cartao: Omit<Cartao, 'id' | 'totalFatura'>) => {
      if (!month || !activeWorkspace) return;

      const newCartao: Cartao = {
        ...cartao,
        id: `card_${Date.now()}`,
        totalFatura: 0,
      };

      const updatedCartoes = [...month.cartoes, newCartao];

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, cartoes: updatedCartoes } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        cartoes: sanitizeForFirestore(updatedCartoes),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Update cartao
   */
  const updateCartao = useCallback(
    async (id: string, data: Partial<Cartao>) => {
      if (!month || !activeWorkspace) return;

      const updatedCartoes = month.cartoes.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...data };
          // Recalculate totalFatura
          updated.totalFatura = calculateTotalFatura(updated.compras);
          return updated;
        }
        return c;
      });

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, cartoes: updatedCartoes } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        cartoes: sanitizeForFirestore(updatedCartoes),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Delete cartao
   */
  const deleteCartao = useCallback(
    async (id: string) => {
      if (!month || !activeWorkspace) return;

      const updatedCartoes = month.cartoes.filter((c) => c.id !== id);

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, cartoes: updatedCartoes } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        cartoes: sanitizeForFirestore(updatedCartoes),
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Add compra to a cartao
   */
  const addCompra = useCallback(
    async (cartaoId: string, compra: Omit<Compra, 'id'>) => {
      if (!month || !activeWorkspace) return;

      // Check if this is a multi-installment purchase
      const isMultiInstallment = compra.parcelasTotal > 1;

      if (isMultiInstallment) {
        // Propagate installments across multiple months
        const cartao = month.cartoes.find(c => c.id === cartaoId);
        if (!cartao) return;

        await propagateInstallments(cartaoId, cartao.nome, compra, month.id);

        // Trigger recalculation
        await recalculateTotals();
      } else {
        // Single payment, add normally
        const newCompra: Compra = {
          ...compra,
          id: `comp_${Date.now()}`,
        };

        const updatedCartoes = month.cartoes.map((c) => {
          if (c.id === cartaoId) {
            const updatedCompras = [...c.compras, newCompra];
            return {
              ...c,
              compras: updatedCompras,
              totalFatura: calculateTotalFatura(updatedCompras),
            };
          }
          return c;
        });

        // Update local state immediately for responsiveness
        setMonth((prev) => (prev ? { ...prev, cartoes: updatedCartoes } : null));

        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
        await updateDoc(monthRef, {
          cartoes: sanitizeForFirestore(updatedCartoes),
          updatedAt: serverTimestamp(),
        });

        // Recalculate and save totals
        await recalculateTotals();
      }
    },
    [month, activeWorkspace, recalculateTotals, propagateInstallments]
  );

  /**
   * Helper: Update all installments in a purchase group
   */
  const updateInstallmentGroup = useCallback(
    async (purchaseGroupId: string, data: Partial<Compra>, currentMonthId: string) => {
      if (!activeWorkspace) return;

      // Fields that should be synced across all installments
      const syncedFields: Partial<Compra> = {};
      if (data.descricao !== undefined) syncedFields.descricao = data.descricao;
      if (data.valorTotal !== undefined) syncedFields.valorTotal = data.valorTotal;
      if (data.marcado !== undefined) syncedFields.marcado = data.marcado;

      // We need to check 12 months back and 12 months forward
      const monthIds: string[] = [];
      let monthId = currentMonthId;

      // Add past months
      for (let i = 0; i < 12; i++) {
        monthId = getPreviousMonthId(monthId);
        monthIds.push(monthId);
      }

      // Add current month
      monthIds.push(currentMonthId);

      // Add future months
      monthId = currentMonthId;
      for (let i = 0; i < 12; i++) {
        monthId = getNextMonthId(monthId);
        monthIds.push(monthId);
      }

      // Update all months
      for (const mId of monthIds) {
        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${mId}`);
        const monthSnap = await getDoc(monthRef);

        if (monthSnap.exists()) {
          const monthData = monthSnap.data() as Month;
          const updatedCartoes = (monthData.cartoes || []).map(cartao => ({
            ...cartao,
            compras: cartao.compras.map(c =>
              c.purchaseGroupId === purchaseGroupId ? { ...c, ...syncedFields } : c
            ),
            totalFatura: calculateTotalFatura(
              cartao.compras.map(c =>
                c.purchaseGroupId === purchaseGroupId ? { ...c, ...syncedFields } : c
              )
            ),
          }));

          await updateDoc(monthRef, {
            cartoes: sanitizeForFirestore(updatedCartoes),
            updatedAt: serverTimestamp(),
          });
        }
      }
    },
    [activeWorkspace]
  );

  /**
   * Update compra in a cartao
   */
  const updateCompra = useCallback(
    async (cartaoId: string, compraId: string, data: Partial<Compra>) => {
      if (!month || !activeWorkspace) return;

      // Find the compra to check if it's part of an installment group
      const cartao = month.cartoes.find(c => c.id === cartaoId);
      const compra = cartao?.compras.find(c => c.id === compraId);
      const purchaseGroupId = compra?.purchaseGroupId;

      if (purchaseGroupId && (data.descricao !== undefined || data.valorTotal !== undefined || data.marcado !== undefined)) {
        // This is part of an installment group, update all installments
        await updateInstallmentGroup(purchaseGroupId, data, month.id);
        // Trigger recalculation
        await recalculateTotals();
      } else {
        // Single purchase or local-only update, update normally
        const updatedCartoes = month.cartoes.map((c) => {
          if (c.id === cartaoId) {
            const updatedCompras = c.compras.map((comp) =>
              comp.id === compraId ? { ...comp, ...data } : comp
            );
            return {
              ...c,
              compras: updatedCompras,
              totalFatura: calculateTotalFatura(updatedCompras),
            };
          }
          return c;
        });

        // Update local state immediately for responsiveness
        setMonth((prev) => (prev ? { ...prev, cartoes: updatedCartoes } : null));

        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
        await updateDoc(monthRef, {
          cartoes: sanitizeForFirestore(updatedCartoes),
          updatedAt: serverTimestamp(),
        });

        // Recalculate and save totals
        await recalculateTotals();
      }
    },
    [month, activeWorkspace, recalculateTotals, updateInstallmentGroup]
  );

  /**
   * Delete compra from a cartao
   */
  const deleteCompra = useCallback(
    async (cartaoId: string, compraId: string) => {
      if (!month || !activeWorkspace) return;

      // Find the compra to check if it's part of an installment group
      const cartao = month.cartoes.find(c => c.id === cartaoId);
      const compra = cartao?.compras.find(c => c.id === compraId);
      const purchaseGroupId = compra?.purchaseGroupId;

      if (purchaseGroupId) {
        // This is part of an installment group, delete all installments
        await deleteInstallmentGroup(purchaseGroupId, month.id);
        // Trigger recalculation
        await recalculateTotals();
      } else {
        // Single purchase, delete normally
        const updatedCartoes = month.cartoes.map((c) => {
          if (c.id === cartaoId) {
            const updatedCompras = c.compras.filter((comp) => comp.id !== compraId);
            return {
              ...c,
              compras: updatedCompras,
              totalFatura: calculateTotalFatura(updatedCompras),
            };
          }
          return c;
        });

        // Update local state immediately for responsiveness
        setMonth((prev) => (prev ? { ...prev, cartoes: updatedCartoes } : null));

        const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
        await updateDoc(monthRef, {
          cartoes: sanitizeForFirestore(updatedCartoes),
          updatedAt: serverTimestamp(),
        });

        // Recalculate and save totals
        await recalculateTotals();
      }
    },
    [month, activeWorkspace, recalculateTotals, deleteInstallmentGroup]
  );

  /**
   * Navigation functions
   */
  const goToNextMonth = useCallback(() => {
    const nextMonthId = getNextMonthId(currentMonthId);
    setCurrentMonthId(nextMonthId);
  }, [currentMonthId]);

  const goToPreviousMonth = useCallback(() => {
    const prevMonthId = getPreviousMonthId(currentMonthId);
    setCurrentMonthId(prevMonthId);
  }, [currentMonthId]);

  const goToMonth = useCallback((monthId: string) => {
    if (isValidMonthId(monthId)) {
      setCurrentMonthId(monthId);
    }
  }, []);

  // Set up real-time listener for month changes
  useEffect(() => {
    if (!activeWorkspace || !isValidMonthId(currentMonthId)) {
      setMonth(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${currentMonthId}`);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      monthRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          // Month exists, update state with latest data
          const monthData = { id: snapshot.id, ...snapshot.data() } as Month;
          setMonth(monthData);
          setLoading(false);
        } else {
          // Month doesn't exist, create it
          try {
            const newMonth = await createMonth(currentMonthId);
            setMonth(newMonth);
            setLoading(false);
          } catch (err: any) {
            console.error('Error creating month:', err);
            setError(err.message || 'Error creating month');
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error('Error listening to month:', error);
        setError(error.message || 'Error listening to month updates');
        setLoading(false);
      }
    );

    // Cleanup: unsubscribe when month changes or component unmounts
    return () => unsubscribe();
  }, [activeWorkspace, currentMonthId, createMonth]);

  return {
    month,
    loading,
    error,
    currentMonthId,
    goToNextMonth,
    goToPreviousMonth,
    goToMonth,
    recalculateTotals,
    updateSaldoInicial,
    addDespesa,
    updateDespesa,
    deleteDespesa,
    addCartao,
    updateCartao,
    deleteCartao,
    addCompra,
    updateCompra,
    deleteCompra,
  };
}
