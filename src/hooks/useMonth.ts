import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
        despesas: updatedDespesas,
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Update despesa
   */
  const updateDespesa = useCallback(
    async (id: string, data: Partial<Despesa>) => {
      if (!month || !activeWorkspace) return;

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

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, despesas: updatedDespesas } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        despesas: updatedDespesas,
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Delete despesa
   */
  const deleteDespesa = useCallback(
    async (id: string) => {
      if (!month || !activeWorkspace) return;

      const updatedDespesas = month.despesas.filter((d) => d.id !== id);

      // Update local state immediately for responsiveness
      setMonth((prev) => (prev ? { ...prev, despesas: updatedDespesas } : null));

      const monthRef = doc(db, `workspaces/${activeWorkspace.id}/months/${month.id}`);
      await updateDoc(monthRef, {
        despesas: updatedDespesas,
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
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
        cartoes: updatedCartoes,
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
        cartoes: updatedCartoes,
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
        cartoes: updatedCartoes,
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
        cartoes: updatedCartoes,
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Update compra in a cartao
   */
  const updateCompra = useCallback(
    async (cartaoId: string, compraId: string, data: Partial<Compra>) => {
      if (!month || !activeWorkspace) return;

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
        cartoes: updatedCartoes,
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
  );

  /**
   * Delete compra from a cartao
   */
  const deleteCompra = useCallback(
    async (cartaoId: string, compraId: string) => {
      if (!month || !activeWorkspace) return;

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
        cartoes: updatedCartoes,
        updatedAt: serverTimestamp(),
      });

      // Recalculate and save totals
      await recalculateTotals();
    },
    [month, activeWorkspace, recalculateTotals]
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
