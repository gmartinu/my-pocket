/**
 * VERSÃO 2 - SQLite-first approach
 * Este hook usa SQLite como fonte primária de dados
 */

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useMonthNavigation } from "../contexts/MonthNavigationContext";
import { useRecurringTemplates } from "./useRecurringTemplates";
import { useSyncContext } from "../contexts/SyncContext";
import { generateUUID } from "../utils/uuid";
import { dataEvents } from "../utils/dataEvents";
import * as syncOps from "../services/syncOperations";
import type {
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
import * as db from "../services/database/operations";

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
    expense: Omit<ExpenseInstanceInsert, "id" | "month_id" | "workspace_id" | "value_calculated" | "created_at" | "updated_at">
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
  backfillPurchaseInstances: (templateId: string) => Promise<void>;
}

// Global locks shared across all useMonth instances to prevent concurrent executions
const ensureTemplateInstancesLock = new Set<string>();
const ensurePurchaseInstancesLock = new Set<string>();

export function useMonth(): UseMonthReturn {
  const { activeWorkspace } = useWorkspace();
  const { currentMonthId, goToNextMonth, goToPreviousMonth, goToMonth } = useMonthNavigation();
  const { calculateTemplatesForMonth } = useRecurringTemplates();
  const { isInitialized, syncNow } = useSyncContext();

  const [month, setMonth] = useState<Month | null>(null);
  const [expenses, setExpenses] = useState<ExpenseInstance[]>([]);
  const [cards, setCards] = useState<CardWithPurchases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ensure all active templates have expense instances for this month
   * Creates missing instances if needed
   */
  const ensureTemplateInstances = useCallback(
    async (monthId: string) => {
      if (!activeWorkspace) return;

      // Check if already running for this month
      const lockKey = `${activeWorkspace.id}:${monthId}`;
      if (ensureTemplateInstancesLock.has(lockKey)) {
        console.log(`🔒 [ensureTemplateInstances] Already running for ${monthId}, skipping...`);
        return;
      }

      // Acquire lock
      ensureTemplateInstancesLock.add(lockKey);
      console.log(`🔓 [ensureTemplateInstances] Acquired lock for ${monthId}`);

      try {
        console.log(`\n🔍 [ensureTemplateInstances] Checking templates for month ${monthId}`);

      // Get templates that should apply to this month (ONLY expense type, NOT card_purchase)
      const templates = calculateTemplatesForMonth(monthId).filter(t => t.type !== 'card_purchase');

      if (templates.length === 0) {
        console.log(`  ⚠️ No active templates apply to ${monthId}\n`);
        return;
      }

      console.log(`  📋 Found ${templates.length} templates that apply to ${monthId}`);

      // Get existing expense instances for this month
      const existingExpenses = await db.getAllExpenseInstances(monthId, activeWorkspace.id);
      const existingByTemplateId = new Map(
        existingExpenses
          .filter(e => e.template_id)
          .map(e => [e.template_id!, e])
      );

      console.log(`  📊 Existing instances in ${monthId}: ${existingExpenses.length}`);
      if (existingByTemplateId.size > 0) {
        console.log(`     From templates:`, Array.from(existingByTemplateId.keys()).join(', '));
      }

      // Create missing instances
      let createdCount = 0;
      for (const template of templates) {
        const existingInstance = existingByTemplateId.get(template.id);

        if (existingInstance) {
          console.log(`  ⏭️ Instance already exists for "${template.name}" (ID: ${existingInstance.id})`);
        } else {
          try {
            const newId = generateUUID();
            console.log(`  🆕 Creating NEW instance for "${template.name}" (ID: ${newId})`);

            const expenseInstance: ExpenseInstance = {
              id: newId,
              month_id: monthId,
              workspace_id: activeWorkspace.id,
              template_id: template.id,
              name: template.name,
              value_planned: template.value_formula,
              value_calculated: template.value_calculated,
              is_paid: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await db.insertExpenseInstance(expenseInstance);
            createdCount++;
            console.log(`  ✅ Created instance for "${template.name}" (ID: ${newId})`);
          } catch (err: any) {
            // If FOREIGN KEY error, the template was probably deleted
            if (err.message?.includes('FOREIGN KEY')) {
              console.warn(`  ⚠️ Template ${template.id} no longer exists, skipping...`);
              continue;
            }
            // Re-throw other errors
            throw err;
          }
        }
      }

        if (createdCount > 0) {
          console.log(`\n  ✅ [ensureTemplateInstances] Created ${createdCount} new expense instances`);
          // Emit event to notify other components
          dataEvents.emit('expenses:changed');
          // Trigger background sync
          syncNow();
        } else {
          console.log(`\n  ✓ [ensureTemplateInstances] All templates already have instances`);
        }
        console.log(''); // Empty line for readability
      } finally {
        // Release lock
        ensureTemplateInstancesLock.delete(lockKey);
        console.log(`🔓 [ensureTemplateInstances] Released lock for ${monthId}`);
      }
    },
    [activeWorkspace, calculateTemplatesForMonth, syncNow]
  );

  /**
   * Ensure all active purchase templates have instances for this month
   * Creates missing purchases if needed (for card_purchase templates)
   */
  const ensurePurchaseInstances = useCallback(
    async (monthId: string) => {
      if (!activeWorkspace) return;

      // Check if already running for this month
      const lockKey = `${activeWorkspace.id}:${monthId}`;
      if (ensurePurchaseInstancesLock.has(lockKey)) {
        console.log(`🔒 [ensurePurchaseInstances] Already running for ${monthId}, skipping...`);
        return;
      }

      // Acquire lock
      ensurePurchaseInstancesLock.add(lockKey);
      console.log(`🔓 [ensurePurchaseInstances] Acquired lock for ${monthId}`);

      try {
        console.log(`\n🔍 [ensurePurchaseInstances] Checking purchase templates for month ${monthId}`);

        // Get ALL templates from SQLite (to avoid race conditions with React state)
        const allTemplates = await db.getAllRecurringTemplates(activeWorkspace.id);
        const [year, month] = monthId.split('-').map(Number);

        // Filter for card_purchase templates that apply to this month
        const templates = allTemplates.filter(t => {
          if (t.type !== 'card_purchase') return false;
          if (!t.is_active) return false;

          // Check start date
          if (t.start_date) {
            const startDate = new Date(t.start_date);
            const targetDate = new Date(year, month - 1, 1);
            if (targetDate < startDate) return false;
          }

          // Check end date
          if (t.end_date) {
            const endDate = new Date(t.end_date);
            const targetDate = new Date(year, month - 1, 1);
            if (targetDate > endDate) return false;
          }

          // Check frequency
          const frequency = t.frequency || 'mensal';
          if (frequency === 'mensal') return true;

          if (frequency === 'anual') {
            if (!t.start_date) return true;
            const startDate = new Date(t.start_date);
            return month === startDate.getMonth() + 1;
          }

          // For bimestral, trimestral, semestral
          if (!t.start_date) return true;
          const startDate = new Date(t.start_date);
          const startYear = startDate.getFullYear();
          const startMonth = startDate.getMonth() + 1;
          const monthsSinceStart = (year - startYear) * 12 + (month - startMonth);
          if (monthsSinceStart < 0) return false;

          let interval = 1;
          if (frequency === 'bimestral') interval = 2;
          else if (frequency === 'trimestral') interval = 3;
          else if (frequency === 'semestral') interval = 6;

          return monthsSinceStart % interval === 0;
        });

        if (templates.length === 0) {
          console.log(`  ⚠️ No active card_purchase templates apply to ${monthId}\n`);
          return;
        }

        console.log(`  📋 Found ${templates.length} card_purchase templates that apply to ${monthId}`);

        // Get all cards from workspace (cards are global now)
        const allCards = await db.getAllCards(activeWorkspace.id);

        if (allCards.length === 0) {
          console.log(`  ⚠️ No cards exist in workspace, skipping purchase instances\n`);
          return;
        }

        // Get existing purchases for this month
        let createdCount = 0;

        for (const template of templates) {
          const metadata = (template.metadata || {}) as any;
          const targetCardId = metadata.card_id;

          if (!targetCardId) {
            console.log(`  ⚠️ Template "${template.name}" has no card_id in metadata, skipping...`);
            continue;
          }

          // Check if card exists
          const targetCard = allCards.find(c => c.id === targetCardId);
          if (!targetCard) {
            console.log(`  ⚠️ Card ${targetCardId} not found, skipping template "${template.name}"`);
            continue;
          }

          // Check if purchase already exists for this template+card+month
          const existingPurchases = await db.getAllPurchasesByCardAndMonth(targetCardId, monthId);
          const existingInstance = existingPurchases.find(p => p.template_id === template.id);

          if (existingInstance) {
            console.log(`  ⏭️ Purchase already exists for "${template.name}" on card "${targetCard.name}" (ID: ${existingInstance.id})`);
          } else {
            try {
              const newId = generateUUID();
              console.log(`  🆕 Creating NEW purchase for "${template.name}" on card "${targetCard.name}" (ID: ${newId})`);

              const purchase: Purchase = {
                id: newId,
                card_id: targetCardId,
                month_id: monthId,
                template_id: template.id,
                description: template.name,
                total_value: template.value_calculated,
                current_installment: 1,
                total_installments: 1,
                is_marked: true,
                purchase_date: new Date().toISOString().split('T')[0],
                purchase_group_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              await db.insertPurchase(purchase);
              console.log(`  ✅ Created purchase for "${template.name}" (ID: ${newId})`);
              createdCount++;
            } catch (err: any) {
              // If FOREIGN KEY error, the template was probably deleted
              if (err.message?.includes('FOREIGN KEY')) {
                console.warn(`  ⚠️ Template ${template.id} no longer exists, skipping...`);
                continue;
              }
              // Re-throw other errors
              throw err;
            }
          }
        }

        if (createdCount > 0) {
          console.log(`\n  ✅ [ensurePurchaseInstances] Created ${createdCount} new purchases`);
          // Emit event to notify other components
          dataEvents.emit('purchases:changed');
          // Trigger background sync
          syncNow();
        } else {
          console.log(`\n  ✓ [ensurePurchaseInstances] All templates already have purchases`);
        }
        console.log(''); // Empty line for readability
      } finally {
        // Release lock
        ensurePurchaseInstancesLock.delete(lockKey);
        console.log(`🔓 [ensurePurchaseInstances] Released lock for ${monthId}`);
      }
    },
    [activeWorkspace, syncNow]
  );

  /**
   * Create new month with template instances
   */
  const createMonth = useCallback(
    async (
      monthId: string,
      year: number,
      month: number
    ): Promise<Month> => {
      if (!activeWorkspace) throw new Error("No active workspace");

      const monthData: Month = {
        id: monthId,
        workspace_id: activeWorkspace.id,
        name: formatMonthName(monthId),
        year,
        month,
        saldo_inicial: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert month into SQLite
      await db.insertMonth(monthData);

      console.log("✅ Month created in SQLite:", monthId);

      // Create expense instances from active templates
      await ensureTemplateInstances(monthId);

      // Create purchase instances from active card_purchase templates
      await ensurePurchaseInstances(monthId);

      // Trigger background sync
      syncNow();

      return monthData;
    },
    [activeWorkspace, ensureTemplateInstances, ensurePurchaseInstances, syncNow]
  );

  /**
   * Load or create month from SQLite
   */
  const loadMonth = useCallback(
    async (monthId: string) => {
      if (!activeWorkspace || !isInitialized) return;

      try {
        setLoading(true);
        setError(null);

        // Try to get existing month from SQLite
        let existingMonth = await db.getMonthById(monthId, activeWorkspace.id);

        if (existingMonth) {
          setMonth(existingMonth);
          // Check and create missing template instances for existing month
          await ensureTemplateInstances(monthId);
          // Check and create missing purchase instances for existing month
          await ensurePurchaseInstances(monthId);
        } else {
          // Create month on-demand (will call ensure functions internally)
          const { year, month } = parseMonthId(monthId);
          const newMonth = await createMonth(monthId, year, month);
          setMonth(newMonth);
        }

        // Load expenses and cards from SQLite for the specific month
        await loadExpenses(monthId);
        await loadCards(monthId);
      } catch (err: any) {
        console.error("❌ Error loading month:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [activeWorkspace, isInitialized, createMonth, ensureTemplateInstances, ensurePurchaseInstances]
  );

  /**
   * Load expenses from SQLite
   */
  const loadExpenses = useCallback(async (monthId?: string) => {
    const targetMonthId = monthId ?? currentMonthId;
    if (!activeWorkspace || !targetMonthId || !isInitialized) return;

    const data = await db.getAllExpenseInstances(targetMonthId, activeWorkspace.id);
    setExpenses(data || []);
  }, [activeWorkspace, currentMonthId, isInitialized]);

  /**
   * Load cards with purchases from SQLite
   */
  const loadCards = useCallback(async (monthId?: string) => {
    const targetMonthId = monthId ?? currentMonthId;
    if (!activeWorkspace || !targetMonthId || !isInitialized) return;

    // Load all cards from workspace (cards are now global)
    const cardsData = await db.getAllCards(activeWorkspace.id);

    // Load purchases for each card, filtered by month
    const cardsWithPurchases: CardWithPurchases[] = await Promise.all(
      cardsData.map(async (card) => {
        const purchases = await db.getAllPurchasesByCardAndMonth(card.id, targetMonthId);
        return {
          ...card,
          purchases,
        };
      })
    );

    setCards(cardsWithPurchases || []);
  }, [activeWorkspace, currentMonthId, isInitialized]);

  // Load month when workspace or monthId changes
  // Note: loadMonth is NOT in dependencies to avoid re-triggers when templates change
  useEffect(() => {
    if (!activeWorkspace || !isInitialized) {
      setMonth(null);
      setExpenses([]);
      setCards([]);
      setLoading(false);
      return;
    }

    loadMonth(currentMonthId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, currentMonthId, isInitialized]);

  // Listen for data change events from other components
  useEffect(() => {
    if (!activeWorkspace || !isInitialized) return;

    console.log('📡 [useMonth] Setting up event listeners');

    // Reload expenses when they change
    const unsubExpenses = dataEvents.on('expenses:changed', () => {
      console.log('📡 [useMonth] Expenses changed, reloading...');
      loadExpenses();
    });

    // Reload month data when it changes
    const unsubMonths = dataEvents.on('months:changed', () => {
      console.log('📡 [useMonth] Month changed, reloading...');
      loadMonth(currentMonthId);
    });

    // Reload cards when they change
    const unsubCards = dataEvents.on('cards:changed', () => {
      console.log('📡 [useMonth] Cards changed, reloading...');
      loadCards();
    });

    // Reload purchases (which are part of cards)
    const unsubPurchases = dataEvents.on('purchases:changed', () => {
      console.log('📡 [useMonth] Purchases changed, reloading cards...');
      loadCards();
    });

    // When templates change, reload expenses and check for purchase instances
    const unsubTemplates = dataEvents.on('templates:changed', async () => {
      console.log('📡 [useMonth] Templates changed, checking instances...');

      // Reload expenses (for expense templates)
      loadExpenses();

      // Check and create purchase instances (for card_purchase templates)
      if (currentMonthId) {
        await ensurePurchaseInstances(currentMonthId);
        // Reload cards to show new purchases
        await loadCards();
      }
    });

    // Cleanup
    return () => {
      console.log('📡 [useMonth] Removing event listeners');
      unsubExpenses();
      unsubMonths();
      unsubCards();
      unsubPurchases();
      unsubTemplates();
    };
  }, [activeWorkspace?.id, currentMonthId, isInitialized, loadExpenses, loadMonth, loadCards, ensureTemplateInstances]);

  /**
   * Update saldo inicial
   */
  const updateSaldoInicial = useCallback(
    async (saldo: number) => {
      if (!month || !activeWorkspace) return;

      await db.updateMonth(month.id, { saldo_inicial: saldo });

      setMonth((prev) => (prev ? { ...prev, saldo_inicial: saldo } : null));

      // Emit event to notify other components
      dataEvents.emit('months:changed');

      syncNow();
    },
    [month, activeWorkspace, syncNow]
  );

  /**
   * Add expense
   */
  const addExpense = useCallback(
    async (
      expense: Omit<ExpenseInstanceInsert, "id" | "month_id" | "workspace_id" | "value_calculated" | "created_at" | "updated_at">
    ) => {
      if (!month || !activeWorkspace) return;

      const expenseData: ExpenseInstance = {
        id: generateUUID(),
        month_id: currentMonthId,
        workspace_id: activeWorkspace.id,
        name: expense.name,
        value_planned: expense.value_planned,
        value_calculated: evaluateFormula(expense.value_planned),
        is_paid: expense.is_paid || false,
        template_id: expense.template_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.insertExpenseInstance(expenseData);
      await loadExpenses();

      // Emit event to notify other components
      dataEvents.emit('expenses:changed');

      syncNow();
    },
    [month, activeWorkspace, currentMonthId, loadExpenses, syncNow]
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

      await db.updateExpenseInstance(id, updateData);
      await loadExpenses();

      // Emit event to notify other components
      dataEvents.emit('expenses:changed');

      syncNow();
    },
    [activeWorkspace, loadExpenses, syncNow]
  );

  /**
   * Delete expense
   */
  const deleteExpense = useCallback(
    async (id: string) => {
      if (!activeWorkspace) return;

      // Use sync service to delete from Supabase → SQLite
      await syncOps.deleteExpenseInstanceSync(id, activeWorkspace.id);
      await loadExpenses();

      // Emit event to notify other components
      dataEvents.emit('expenses:changed');
    },
    [activeWorkspace, loadExpenses]
  );

  /**
   * Backfill template instances for existing months
   * Fetches template directly from SQLite to avoid state race conditions
   */
  const backfillTemplateInstances = useCallback(
    async (templateId: string) => {
      if (!activeWorkspace) return;

      console.log("🔄 [backfillTemplateInstances] Starting for template:", templateId);
      console.log("🔄 [backfillTemplateInstances] Current month:", currentMonthId);

      try {
        // Get template from SQLite (not from state to avoid race condition)
        const template = await db.getRecurringTemplateById(templateId);

        if (!template) {
          console.error("❌ Template not found in SQLite:", templateId);
          return;
        }

        console.log("📋 [backfillTemplateInstances] Template:", template.name);
        console.log(`   - Active: ${template.is_active}`);
        console.log(`   - Frequency: ${template.frequency}`);
        console.log(`   - Start: ${template.start_date}`);
        console.log(`   - End: ${template.end_date || 'none'}`);

        if (!template.is_active) {
          console.log("⚠️ Template is inactive, skipping backfill");
          return;
        }

        // Get all existing months from current month onwards
        const allMonths = await db.getAllMonths(activeWorkspace.id);
        const applicableMonths = allMonths.filter(m => m.id >= currentMonthId);

        console.log(
          "🔄 [backfillTemplateInstances] Found",
          applicableMonths.length,
          "months (current + future):",
          applicableMonths.map(m => m.id).join(', ')
        );

        // For each existing month, check if template applies using same logic as shouldApplyInMonth
        let createdCount = 0;
        let skippedCount = 0;
        let notApplicableCount = 0;

        for (const monthRecord of applicableMonths) {
          console.log(`\n📅 [backfillTemplateInstances] Checking month: ${monthRecord.id}`);

          const [year, monthNum] = monthRecord.id.split('-').map(Number);

          // Check if template applies to this month
          let applies = true;

          // Check start date
          if (template.start_date) {
            const startDate = new Date(template.start_date);
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth() + 1;
            const targetYearMonth = year * 12 + monthNum;
            const startYearMonth = startYear * 12 + startMonth;
            if (targetYearMonth < startYearMonth) {
              applies = false;
              console.log(`  ✗ Before start date`);
            }
          }

          // Check end date
          if (applies && template.end_date) {
            const endDate = new Date(template.end_date);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;
            const targetYearMonth = year * 12 + monthNum;
            const endYearMonth = endYear * 12 + endMonth;
            if (targetYearMonth > endYearMonth) {
              applies = false;
              console.log(`  ✗ After end date`);
            }
          }

          // Check frequency
          if (applies) {
            const frequency = template.frequency || 'mensal';
            if (frequency === 'mensal') {
              applies = true;
            } else if (frequency === 'anual') {
              if (template.start_date) {
                const startDate = new Date(template.start_date);
                applies = monthNum === startDate.getMonth() + 1;
              }
            } else {
              // bimestral, trimestral, semestral
              if (template.start_date) {
                const startDate = new Date(template.start_date);
                const startYear = startDate.getFullYear();
                const startMonth = startDate.getMonth() + 1;
                const monthsSinceStart = (year - startYear) * 12 + (monthNum - startMonth);
                if (monthsSinceStart >= 0) {
                  let interval = 1;
                  if (frequency === 'bimestral') interval = 2;
                  else if (frequency === 'trimestral') interval = 3;
                  else if (frequency === 'semestral') interval = 6;
                  applies = monthsSinceStart % interval === 0;
                } else {
                  applies = false;
                }
              }
            }
          }

          if (applies) {
            console.log(`  ✓ Template applies to ${monthRecord.id}`);

            // Check if instance already exists
            const existingExpenses = await db.getAllExpenseInstances(monthRecord.id, activeWorkspace.id);
            const existingInstance = existingExpenses.find(e => e.template_id === templateId);

            if (existingInstance) {
              console.log(`  ⏭️ Instance already exists for ${monthRecord.id} (ID: ${existingInstance.id})`);
              skippedCount++;
            } else {
              const newId = generateUUID();
              console.log(`  🆕 Creating NEW instance for ${monthRecord.id} (ID: ${newId})`);

              const expenseInstance: ExpenseInstance = {
                id: newId,
                month_id: monthRecord.id,
                workspace_id: activeWorkspace.id,
                template_id: template.id,
                name: template.name,
                value_planned: template.value_formula,
                value_calculated: template.value_calculated,
                is_paid: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              await db.insertExpenseInstance(expenseInstance);
              console.log(`  ✅ Created instance for ${monthRecord.id} (ID: ${newId})`);
              createdCount++;
            }
          } else {
            console.log(`  ✗ Template does NOT apply to ${monthRecord.id}`);
            notApplicableCount++;
          }
        }

        console.log("\n🔄 [backfillTemplateInstances] Summary:");
        console.log(`  - Created: ${createdCount}`);
        console.log(`  - Skipped (already exists): ${skippedCount}`);
        console.log(`  - Not applicable: ${notApplicableCount}`);
        console.log("🔄 [backfillTemplateInstances] Completed\n");

        // Reload expenses if we're still on the same month
        await loadExpenses();

        // Emit event to notify other components
        dataEvents.emit('expenses:changed');

        // Trigger sync
        syncNow();
      } catch (err: any) {
        console.error("❌ Error in backfillTemplateInstances:", err);
      }
    },
    [activeWorkspace, currentMonthId, loadExpenses, syncNow]
  );

  /**
   * Backfill purchase instances for existing months
   * Fetches template directly from SQLite to avoid state race conditions
   */
  const backfillPurchaseInstances = useCallback(
    async (templateId: string) => {
      if (!activeWorkspace) return;

      console.log("🔄 [backfillPurchaseInstances] Starting for template:", templateId);
      console.log("🔄 [backfillPurchaseInstances] Current month:", currentMonthId);

      try {
        // Get template from SQLite (not from state to avoid race condition)
        const template = await db.getRecurringTemplateById(templateId);

        if (!template) {
          console.error("❌ Template not found in SQLite:", templateId);
          return;
        }

        if (template.type !== 'card_purchase') {
          console.error("❌ Template is not card_purchase type:", template.type);
          return;
        }

        console.log("📋 [backfillPurchaseInstances] Template:", template.name);
        console.log(`   - Active: ${template.is_active}`);
        console.log(`   - Frequency: ${template.frequency}`);

        if (!template.is_active) {
          console.log("⚠️ Template is inactive, skipping backfill");
          return;
        }

        const metadata = (template.metadata || {}) as any;
        const targetCardId = metadata.card_id;

        if (!targetCardId) {
          console.error("❌ Template has no card_id in metadata");
          return;
        }

        // Get all existing months (include past, present, and future)
        const allMonths = await db.getAllMonths(activeWorkspace.id);

        console.log(
          "🔄 [backfillPurchaseInstances] Found",
          allMonths.length,
          "total months:",
          allMonths.map(m => m.id).join(', ')
        );

        // For each existing month, check if template applies
        let createdCount = 0;
        let skippedCount = 0;
        let notApplicableCount = 0;

        for (const monthRecord of allMonths) {
          console.log(`\n📅 [backfillPurchaseInstances] Checking month: ${monthRecord.id}`);

          const [year, monthNum] = monthRecord.id.split('-').map(Number);

          // Check if template applies (same logic as shouldApplyInMonth)
          let applies = true;

          // Check start date
          if (template.start_date) {
            const startDate = new Date(template.start_date);
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth() + 1;
            const targetYearMonth = year * 12 + monthNum;
            const startYearMonth = startYear * 12 + startMonth;
            if (targetYearMonth < startYearMonth) {
              applies = false;
              console.log(`  ✗ Before start date`);
            }
          }

          // Check end date
          if (applies && template.end_date) {
            const endDate = new Date(template.end_date);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;
            const targetYearMonth = year * 12 + monthNum;
            const endYearMonth = endYear * 12 + endMonth;
            if (targetYearMonth > endYearMonth) {
              applies = false;
              console.log(`  ✗ After end date`);
            }
          }

          // Check frequency
          if (applies) {
            const frequency = template.frequency || 'mensal';
            if (frequency === 'mensal') {
              applies = true;
            } else if (frequency === 'anual') {
              if (template.start_date) {
                const startDate = new Date(template.start_date);
                applies = monthNum === startDate.getMonth() + 1;
              }
            } else {
              if (template.start_date) {
                const startDate = new Date(template.start_date);
                const startYear = startDate.getFullYear();
                const startMonth = startDate.getMonth() + 1;
                const monthsSinceStart = (year - startYear) * 12 + (monthNum - startMonth);
                if (monthsSinceStart >= 0) {
                  let interval = 1;
                  if (frequency === 'bimestral') interval = 2;
                  else if (frequency === 'trimestral') interval = 3;
                  else if (frequency === 'semestral') interval = 6;
                  applies = monthsSinceStart % interval === 0;
                } else {
                  applies = false;
                }
              }
            }
          }

          if (applies) {
            console.log(`  ✓ Template applies to ${monthRecord.id}`);

            // Get all cards from workspace (cards are global now)
            const allCards = await db.getAllCards(activeWorkspace.id);
            const targetCard = allCards.find(c => c.id === targetCardId);

            if (!targetCard) {
              console.log(`  ⚠️ Card ${targetCardId} not found in workspace, skipping...`);
              notApplicableCount++;
              continue;
            }

            // Check if purchase already exists for this template+card+month
            const existingPurchases = await db.getAllPurchasesByCardAndMonth(targetCardId, monthRecord.id);
            const existingInstance = existingPurchases.find(p => p.template_id === templateId);

            if (existingInstance) {
              console.log(`  ⏭️ Purchase already exists for ${monthRecord.id} (ID: ${existingInstance.id})`);
              skippedCount++;
            } else {
              const newId = generateUUID();
              console.log(`  🆕 Creating NEW purchase for ${monthRecord.id} (ID: ${newId})`);

              const purchase: Purchase = {
                id: newId,
                card_id: targetCardId,
                month_id: monthId,
                template_id: template.id,
                description: template.name,
                total_value: template.value_calculated,
                current_installment: 1,
                total_installments: 1,
                is_marked: true,
                purchase_date: new Date().toISOString().split('T')[0],
                purchase_group_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              await db.insertPurchase(purchase);
              console.log(`  ✅ Created purchase for ${monthRecord.id} (ID: ${newId})`);
              createdCount++;
            }
          } else {
            console.log(`  ✗ Template does NOT apply to ${monthRecord.id}`);
            notApplicableCount++;
          }
        }

        console.log("\n🔄 [backfillPurchaseInstances] Summary:");
        console.log(`  - Created: ${createdCount}`);
        console.log(`  - Skipped (already exists): ${skippedCount}`);
        console.log(`  - Not applicable: ${notApplicableCount}`);
        console.log("🔄 [backfillPurchaseInstances] Completed\n");

        // Reload cards to get updated purchases
        await loadCards();

        // Emit event to notify other components
        dataEvents.emit('purchases:changed');

        // Trigger sync
        syncNow();
      } catch (err: any) {
        console.error("❌ Error in backfillPurchaseInstances:", err);
      }
    },
    [activeWorkspace, currentMonthId, loadCards, syncNow]
  );

  /**
   * Add card
   */
  const addCard = useCallback(
    async (card: Omit<CardInsert, "id" | "workspace_id">) => {
      if (!activeWorkspace) return;

      const cardData: Card = {
        id: generateUUID(),
        workspace_id: activeWorkspace.id,
        name: card.name,
        total_limit: card.total_limit || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.insertCard(cardData);
      await loadCards();

      // Emit event to notify other components
      dataEvents.emit('cards:changed');

      syncNow();
    },
    [activeWorkspace, loadCards, syncNow]
  );

  /**
   * Update card
   */
  const updateCard = useCallback(
    async (id: string, data: Partial<Card>) => {
      if (!activeWorkspace) return;

      await db.updateCard(id, data);
      await loadCards();

      // Emit event to notify other components
      dataEvents.emit('cards:changed');

      syncNow();
    },
    [activeWorkspace, loadCards, syncNow]
  );

  /**
   * Delete card
   */
  const deleteCard = useCallback(
    async (id: string) => {
      if (!activeWorkspace) return;

      // Use sync service to delete from Supabase → SQLite
      await syncOps.deleteCardSync(id, activeWorkspace.id);
      await loadCards();

      // Emit event to notify other components
      dataEvents.emit('cards:changed');
    },
    [activeWorkspace, loadCards]
  );

  /**
   * Add purchase
   */
  const addPurchase = useCallback(
    async (
      cardId: string,
      purchase: Omit<PurchaseInsert, "id" | "card_id" | "month_id">
    ) => {
      if (!activeWorkspace || !currentMonthId) return;

      const purchaseData: Purchase = {
        id: generateUUID(),
        card_id: cardId,
        month_id: currentMonthId,
        description: purchase.description,
        total_value: purchase.total_value,
        current_installment: purchase.current_installment || 1,
        total_installments: purchase.total_installments || 1,
        is_marked: purchase.is_marked !== false,
        purchase_date:
          purchase.purchase_date || new Date().toISOString().split("T")[0],
        template_id: purchase.template_id || null,
        purchase_group_id: purchase.purchase_group_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.insertPurchase(purchaseData);
      await loadCards();

      // Emit event to notify other components
      dataEvents.emit('purchases:changed');

      syncNow();
    },
    [activeWorkspace, currentMonthId, loadCards, syncNow]
  );

  /**
   * Update purchase
   */
  const updatePurchase = useCallback(
    async (id: string, data: Partial<Purchase>) => {
      await db.updatePurchase(id, data);
      await loadCards();

      // Emit event to notify other components
      dataEvents.emit('purchases:changed');

      syncNow();
    },
    [loadCards, syncNow]
  );

  /**
   * Delete purchase
   */
  const deletePurchase = useCallback(async (id: string) => {
    // Use sync service to delete from Supabase → SQLite
    await syncOps.deletePurchaseSync(id);
    await loadCards();

    // Emit event to notify other components
    dataEvents.emit('purchases:changed');
  }, [loadCards]);

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
    backfillPurchaseInstances,
  };
}
