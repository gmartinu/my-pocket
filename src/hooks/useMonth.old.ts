import { useState, useEffect, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useMonthNavigation } from "../contexts/MonthNavigationContext";
import { useRecurringTemplates } from "./useRecurringTemplates";
import {
  Month,
  MonthInsert,
  ExpenseInstance,
  ExpenseInstanceInsert,
  Card,
  CardInsert,
  Purchase,
  PurchaseInsert,
  CardWithPurchases,
} from "../types/supabase";
import {
  formatMonthName,
  parseMonthId,
} from "../utils/dateUtils";
import { evaluateFormula } from "../utils/calculations";

export interface UseMonthReturn {
  month: Month | null;
  expenses: ExpenseInstance[];
  cards: CardWithPurchases[];
  loading: boolean;
  error: string | null;

  // Navigation
  currentMonthId: string;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToMonth: (monthId: string) => void;

  // Saldo inicial
  updateSaldoInicial: (saldo: number) => Promise<void>;

  // Despesas
  addExpense: (
    expense: Omit<ExpenseInstanceInsert, "id" | "month_id" | "workspace_id">
  ) => Promise<void>;
  updateExpense: (id: string, data: Partial<ExpenseInstance>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Cartões
  addCard: (
    card: Omit<CardInsert, "id" | "month_id" | "workspace_id">
  ) => Promise<void>;
  updateCard: (id: string, data: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  // Compras
  addPurchase: (
    cardId: string,
    purchase: Omit<PurchaseInsert, "id" | "card_id">
  ) => Promise<void>;
  updatePurchase: (id: string, data: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;

  // Totals (calculated)
  total_expenses: number;
  total_cards: number;
  sobra: number;

  // Templates
  backfillTemplateInstances: (templateId: string) => Promise<void>;
}

export function useMonth(): UseMonthReturn {
  const { activeWorkspace } = useWorkspace();
  const { currentMonthId, goToNextMonth, goToPreviousMonth, goToMonth } = useMonthNavigation();
  const { calculateTemplatesForMonth } = useRecurringTemplates();
  const [month, setMonth] = useState<Month | null>(null);
  const [expenses, setExpenses] = useState<ExpenseInstance[]>([]);
  const [cards, setCards] = useState<CardWithPurchases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] =
    useState<RealtimeChannel | null>(null);

  // Load month when workspace or monthId changes
  useEffect(() => {
    if (!activeWorkspace) {
      setMonth(null);
      setExpenses([]);
      setCards([]);
      setLoading(false);
      return;
    }

    loadMonth(currentMonthId);
  }, [activeWorkspace?.id, currentMonthId, loadMonth]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!activeWorkspace || !month) {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
      }
      return;
    }

    const channel = supabase
      .channel(`month-${activeWorkspace.id}-${currentMonthId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_instances",
          filter: `month_id=eq.${currentMonthId}`,
        },
        () => loadExpenses()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: `month_id=eq.${currentMonthId}`,
        },
        () => loadCards()
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeWorkspace?.id, month?.id, currentMonthId, loadExpenses, loadCards]);

  /**
   * Create new month
   */
  const createMonth = useCallback(
    async (
      monthId: string,
      year: number,
      month: number
    ): Promise<Month> => {
      if (!activeWorkspace) throw new Error("No active workspace");

      const monthData: MonthInsert = {
        id: monthId,
        workspace_id: activeWorkspace.id,
        name: formatMonthName(monthId),
        year,
        month,
        saldo_inicial: 0,
      };

      const { data, error } = await supabase
        .from("months")
        .insert(monthData)
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Month created:", monthId);
      console.log("🏗️ [createMonth] ========== DEBUG START ==========");
      console.log("🏗️ [createMonth] Creating month:", monthId);
      console.log("🏗️ [createMonth] Workspace:", activeWorkspace.id);
      console.log("🏗️ [createMonth] Calling calculateTemplatesForMonth with:", monthId);

      // Create expense instances from active templates
      const templates = calculateTemplatesForMonth(monthId);

      console.log("🏗️ [createMonth] Templates returned:", templates.length);
      console.log("🏗️ [createMonth] Template details:", templates.map(t => ({
        id: t.id,
        name: t.name,
        frequency: t.frequency,
        start_date: t.start_date,
        end_date: t.end_date,
        is_active: t.is_active
      })));

      if (templates.length > 0) {
        console.log(`📋 [createMonth] Will create ${templates.length} expense instances`);

        const expenseInstances: ExpenseInstanceInsert[] = templates.map((template) => ({
          month_id: monthId,
          workspace_id: activeWorkspace.id,
          template_id: template.id,
          name: template.name,
          value_planned: template.value_formula,
          value_calculated: template.value_calculated,
          is_paid: false,
        }));

        const { error: insertError } = await supabase.from("expense_instances").insert(expenseInstances);

        if (insertError) {
          console.error("❌ Error creating recurring expenses:", insertError);
        } else {
          console.log(`✅ Created ${templates.length} expenses from templates`);
        }
      } else {
        console.log(`⚠️ [createMonth] No templates found for ${monthId}`);
      }

      return data;
    },
    [activeWorkspace, calculateTemplatesForMonth]
  );

  /**
   * Load or create month
   */
  const loadMonth = useCallback(
    async (monthId: string) => {
      if (!activeWorkspace) return;

      try {
        setLoading(true);
        setError(null);

        // Try to get existing month
        const { data: existingMonth, error: monthError } = await supabase
          .from("months")
          .select("*")
          .eq("id", monthId)
          .eq("workspace_id", activeWorkspace.id)
          .single();

        if (monthError && monthError.code !== "PGRST116") {
          throw monthError;
        }

        if (existingMonth) {
          setMonth(existingMonth);
        } else {
          // Create month on-demand
          const { year, month } = parseMonthId(monthId);
          const newMonth = await createMonth(monthId, year, month);
          setMonth(newMonth);
        }

        // Load expenses and cards
        await Promise.all([loadExpenses(), loadCards()]);
      } catch (err: any) {
        console.error("❌ Error loading month:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [activeWorkspace, createMonth, loadExpenses, loadCards]
  );

  /**
   * Load expenses
   */
  const loadExpenses = useCallback(async () => {
    if (!activeWorkspace || !currentMonthId) return;

    const { data, error } = await supabase
      .from("expense_instances")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .eq("month_id", currentMonthId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Error loading expenses:", error);
      return;
    }

    setExpenses(data || []);
  }, [activeWorkspace, currentMonthId]);

  /**
   * Load cards with purchases
   */
  const loadCards = useCallback(async () => {
    if (!activeWorkspace || !currentMonthId) return;

    const { data: cardsData, error: cardsError } = await supabase
      .from("cards")
      .select("*, purchases(*)")
      .eq("workspace_id", activeWorkspace.id)
      .eq("month_id", currentMonthId)
      .order("created_at", { ascending: true });

    if (cardsError) {
      console.error("❌ Error loading cards:", cardsError);
      return;
    }

    setCards(cardsData || []);
  }, [activeWorkspace, currentMonthId]);

  /**
   * Update saldo inicial
   */
  const updateSaldoInicial = useCallback(
    async (saldo: number) => {
      if (!month || !activeWorkspace) return;

      const { error } = await supabase
        .from("months")
        .update({ saldo_inicial: saldo })
        .eq("id", month.id)
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;

      setMonth((prev) => (prev ? { ...prev, saldo_inicial: saldo } : null));
    },
    [month, activeWorkspace]
  );

  /**
   * Add expense
   */
  const addExpense = useCallback(
    async (
      expense: Omit<ExpenseInstanceInsert, "id" | "month_id" | "workspace_id">
    ) => {
      if (!month || !activeWorkspace) return;

      const expenseData: ExpenseInstanceInsert = {
        month_id: currentMonthId,
        workspace_id: activeWorkspace.id,
        name: expense.name,
        value_planned: expense.value_planned,
        value_calculated: evaluateFormula(expense.value_planned),
        is_paid: expense.is_paid || false,
        template_id: expense.template_id || null,
      };

      const { error } = await supabase.from("expense_instances").insert(expenseData);

      if (error) throw error;

      await loadExpenses();
    },
    [month, activeWorkspace, currentMonthId]
  );

  /**
   * Update expense
   */
  const updateExpense = useCallback(
    async (id: string, data: Partial<ExpenseInstance>) => {
      if (!activeWorkspace) return;

      const updateData: any = { ...data };
      if (data.value_planned !== undefined) {
        updateData.value_calculated = evaluateFormula(data.value_planned);
      }

      const { error } = await supabase
        .from("expense_instances")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;

      await loadExpenses();
    },
    [activeWorkspace]
  );

  /**
   * Delete expense
   */
  const deleteExpense = useCallback(
    async (id: string) => {
      if (!activeWorkspace) return;

      const { error } = await supabase
        .from("expense_instances")
        .delete()
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;

      await loadExpenses();
    },
    [activeWorkspace, loadExpenses]
  );

  /**
   * Backfill template instances for existing months
   * Call this after creating a new template to populate future months that already exist
   */
  const backfillTemplateInstances = useCallback(
    async (templateId: string) => {
      if (!activeWorkspace) return;

      console.log("🔄 [backfillTemplateInstances] ========== START ==========");
      console.log("🔄 [backfillTemplateInstances] Template ID:", templateId);
      console.log("🔄 [backfillTemplateInstances] Starting from month:", currentMonthId);

      try {
        // Get all existing months from current month onwards
        const { data: existingMonths, error: monthsError } = await supabase
          .from("months")
          .select("id")
          .eq("workspace_id", activeWorkspace.id)
          .gte("id", currentMonthId)
          .order("id", { ascending: true });

        if (monthsError) {
          console.error("❌ Error fetching months:", monthsError);
          return;
        }

        if (!existingMonths || existingMonths.length === 0) {
          console.log("⚠️ No existing months to backfill");
          return;
        }

        console.log(
          "🔄 Found",
          existingMonths.length,
          "existing months:",
          existingMonths.map((m) => m.id)
        );

        // For each existing month, check if template applies
        for (const month of existingMonths) {
          console.log(`\n🔍 Checking month: ${month.id}`);

          const templates = calculateTemplatesForMonth(month.id);
          const template = templates.find((t) => t.id === templateId);

          if (template) {
            console.log(
              `✅ Template "${template.name}" applies to ${month.id}, checking if instance exists...`
            );

            // Check if instance already exists
            const { data: existing, error: checkError } = await supabase
              .from("expense_instances")
              .select("id")
              .eq("month_id", month.id)
              .eq("template_id", templateId)
              .eq("workspace_id", activeWorkspace.id)
              .maybeSingle();

            if (checkError) {
              console.error("❌ Error checking existing instance:", checkError);
              continue;
            }

            if (existing) {
              console.log(`⏭️ Instance already exists for ${month.id}, skipping`);
            } else {
              console.log(`🆕 Creating instance for ${month.id}`);

              // Create instance
              const { error: insertError } = await supabase
                .from("expense_instances")
                .insert({
                  month_id: month.id,
                  workspace_id: activeWorkspace.id,
                  template_id: template.id,
                  name: template.name,
                  value_planned: template.value_formula,
                  value_calculated: template.value_calculated,
                  is_paid: false,
                });

              if (insertError) {
                console.error("❌ Error creating instance:", insertError);
              } else {
                console.log(`✅ Created instance for ${month.id}`);
              }
            }
          } else {
            console.log(`⏭️ Template does not apply to ${month.id}, skipping`);
          }
        }

        console.log("🔄 [backfillTemplateInstances] ========== COMPLETED ==========\n");

        // Reload expenses if we're still on the same month
        await loadExpenses();
      } catch (err: any) {
        console.error("❌ Error in backfillTemplateInstances:", err);
      }
    },
    [activeWorkspace, currentMonthId, calculateTemplatesForMonth, loadExpenses]
  );

  /**
   * Add card
   */
  const addCard = useCallback(
    async (card: Omit<CardInsert, "id" | "month_id" | "workspace_id">) => {
      if (!month || !activeWorkspace) return;

      const cardData: CardInsert = {
        month_id: currentMonthId,
        workspace_id: activeWorkspace.id,
        name: card.name,
        total_limit: card.total_limit || 0,
      };

      const { error } = await supabase.from("cards").insert(cardData);

      if (error) throw error;

      await loadCards();
    },
    [month, activeWorkspace, currentMonthId]
  );

  /**
   * Update card
   */
  const updateCard = useCallback(
    async (id: string, data: Partial<Card>) => {
      if (!activeWorkspace) return;

      const { error } = await supabase
        .from("cards")
        .update(data)
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;

      await loadCards();
    },
    [activeWorkspace]
  );

  /**
   * Delete card
   */
  const deleteCard = useCallback(
    async (id: string) => {
      if (!activeWorkspace) return;

      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", id)
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;

      await loadCards();
    },
    [activeWorkspace]
  );

  /**
   * Add purchase (NO auto-propagation for installments)
   */
  const addPurchase = useCallback(
    async (
      cardId: string,
      purchase: Omit<PurchaseInsert, "id" | "card_id">
    ) => {
      if (!activeWorkspace) return;

      const purchaseData: PurchaseInsert = {
        card_id: cardId,
        description: purchase.description,
        total_value: purchase.total_value,
        current_installment: purchase.current_installment || 1,
        total_installments: purchase.total_installments || 1,
        is_marked: purchase.is_marked !== false,
        purchase_date:
          purchase.purchase_date || new Date().toISOString().split("T")[0],
        template_id: purchase.template_id || null,
        purchase_group_id: purchase.purchase_group_id || null,
      };

      const { error } = await supabase.from("purchases").insert(purchaseData);

      if (error) throw error;

      await loadCards();
    },
    [activeWorkspace]
  );

  /**
   * Update purchase
   */
  const updatePurchase = useCallback(
    async (id: string, data: Partial<Purchase>) => {
      const { error } = await supabase
        .from("purchases")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      await loadCards();
    },
    []
  );

  /**
   * Delete purchase
   */
  const deletePurchase = useCallback(async (id: string) => {
    const { error } = await supabase.from("purchases").delete().eq("id", id);

    if (error) throw error;

    await loadCards();
  }, []);

  // Calculate totals
  const total_expenses = expenses.reduce(
    (sum, e) => sum + (e.value_calculated || 0),
    0
  );

  const total_cards = cards.reduce((sum, card) => {
    const purchases = card.purchases || [];
    return (
      sum +
      purchases.reduce((s: number, p: Purchase) => {
        return p.is_marked ? s + (p.total_value || 0) / (p.total_installments || 1) : s;
      }, 0)
    );
  }, 0);

  const sobra = (month?.saldo_inicial || 0) - total_expenses - total_cards;

  return {
    month,
    expenses,
    cards,
    loading,
    error,
    currentMonthId,
    goToNextMonth,
    goToPreviousMonth,
    goToMonth,
    updateSaldoInicial,
    addExpense,
    updateExpense,
    deleteExpense,
    addCard,
    updateCard,
    deleteCard,
    addPurchase,
    updatePurchase,
    deletePurchase,
    total_expenses,
    total_cards,
    sobra,
    backfillTemplateInstances,
  };
}
