/**
 * VERSÃO 2 - SQLite-first approach
 * Este hook usa SQLite como fonte primária de dados
 * A sincronização com Supabase acontece em background via SyncContext
 */

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useSyncContext } from "../contexts/SyncContext";
import { generateUUID } from "../utils/uuid";
import { dataEvents } from "../utils/dataEvents";
import * as syncOps from "../services/syncOperations";
import type {
  RecurringTemplate,
  RecurringTemplateInsert,
  RecurringTemplateUpdate,
  RecurrenceFrequency,
} from "../types/supabase";
import { evaluateFormula } from "../utils/calculations";
import * as db from "../services/database/operations";

export interface UseRecurringTemplatesReturn {
  templates: RecurringTemplate[];
  loading: boolean;
  error: string | null;

  // CRUD operations
  createTemplate: (
    template: Omit<
      RecurringTemplateInsert,
      "id" | "workspace_id" | "value_calculated"
    >
  ) => Promise<RecurringTemplate>;
  updateTemplate: (
    id: string,
    data: Partial<RecurringTemplateUpdate>
  ) => Promise<void>;
  deleteTemplate: (id: string, currentMonthId?: string) => Promise<void>;
  toggleTemplate: (id: string, isActive: boolean) => Promise<void>;

  // Queries
  getActiveTemplates: (
    type?: "expense" | "card_purchase"
  ) => RecurringTemplate[];
  getTemplateById: (id: string) => RecurringTemplate | null;

  // Calculations
  calculateTemplatesForMonth: (monthId: string) => RecurringTemplate[];

  // Refresh
  refresh: () => Promise<void>;
}

export function useRecurringTemplates(): UseRecurringTemplatesReturn {
  const { activeWorkspace } = useWorkspace();
  const { isInitialized, syncNow } = useSyncContext();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load templates from SQLite
   */
  const loadTemplates = useCallback(async () => {
    if (!activeWorkspace || !isInitialized) return;

    try {
      setLoading(true);
      setError(null);

      console.log("📋 [useRecurringTemplates v2] Loading from SQLite...");
      const data = await db.getAllRecurringTemplates(activeWorkspace.id);

      console.log("📋 [useRecurringTemplates v2] Loaded", data.length, "templates");
      setTemplates(data);
    } catch (err: any) {
      console.error("❌ Error loading templates:", err);
      setError(err.message || "Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, isInitialized]);

  // Load templates when workspace or sync initializes
  useEffect(() => {
    if (!activeWorkspace || !isInitialized) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    loadTemplates();
  }, [activeWorkspace?.id, isInitialized, loadTemplates]);

  // Listen for templates:changed event to reload from SQLite
  useEffect(() => {
    if (!activeWorkspace || !isInitialized) return;

    console.log('📡 [useRecurringTemplates] Setting up event listener for templates:changed');

    const unsubscribe = dataEvents.on('templates:changed', () => {
      console.log('📡 [useRecurringTemplates] Templates changed, reloading from SQLite...');
      loadTemplates();
    });

    return () => {
      console.log('📡 [useRecurringTemplates] Removing event listener');
      unsubscribe();
    };
  }, [activeWorkspace?.id, isInitialized, loadTemplates]);

  /**
   * Create a new template
   * Writes to SQLite immediately, syncs to Supabase in background
   */
  const createTemplate = useCallback(
    async (
      template: Omit<
        RecurringTemplateInsert,
        "id" | "workspace_id" | "value_calculated"
      >
    ): Promise<RecurringTemplate> => {
      if (!activeWorkspace) throw new Error("No active workspace");

      try {
        const valueCalculated = evaluateFormula(template.value_formula);

        const newTemplate: RecurringTemplate = {
          id: generateUUID(),
          workspace_id: activeWorkspace.id,
          type: template.type,
          name: template.name,
          value_formula: template.value_formula,
          value_calculated: valueCalculated,
          frequency: template.frequency || "mensal",
          start_date:
            template.start_date || new Date().toISOString().split("T")[0],
          end_date: template.end_date || null,
          is_active: template.is_active !== false,
          metadata: template.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Write to SQLite immediately
        await db.insertRecurringTemplate(newTemplate);

        // Update local state immediately
        setTemplates(prev => [newTemplate, ...prev]);

        console.log("✅ Template created in SQLite:", newTemplate.id);

        // Emit event to notify other components
        dataEvents.emit('templates:changed');

        // Trigger background sync
        syncNow();

        return newTemplate;
      } catch (err: any) {
        console.error("❌ Error creating template:", err);
        throw new Error(err.message || "Erro ao criar template");
      }
    },
    [activeWorkspace, syncNow]
  );

  /**
   * Update a template
   */
  const updateTemplate = useCallback(
    async (
      id: string,
      data: Partial<RecurringTemplateUpdate>
    ): Promise<void> => {
      if (!activeWorkspace) throw new Error("No active workspace");

      try {
        // Recalculate value if formula changed
        const updateData: any = { ...data };
        if (data.value_formula !== undefined) {
          updateData.value_calculated = evaluateFormula(data.value_formula);
        }

        // Update in SQLite
        await db.updateRecurringTemplate(id, updateData);

        // Update local state
        setTemplates(prev =>
          prev.map(t => (t.id === id ? { ...t, ...updateData } : t))
        );

        console.log("✅ Template updated in SQLite:", id);

        // Emit event to notify other components
        dataEvents.emit('templates:changed');

        // Trigger background sync
        syncNow();
      } catch (err: any) {
        console.error("❌ Error updating template:", err);
        throw new Error(err.message || "Erro ao atualizar template");
      }
    },
    [activeWorkspace, syncNow]
  );

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(
    async (id: string, currentMonthId?: string): Promise<void> => {
      if (!activeWorkspace) throw new Error("No active workspace");

      try {
        // Use sync service to delete from Supabase → SQLite
        await syncOps.deleteRecurringTemplateSync(id, activeWorkspace.id, currentMonthId);

        // Update local state
        setTemplates(prev => prev.filter(t => t.id !== id));

        console.log("✅ Template deleted:", id);

        // Emit event to notify other components
        dataEvents.emit('templates:changed');
        // Also emit expenses:changed since we may have deleted instances
        dataEvents.emit('expenses:changed');
      } catch (err: any) {
        console.error("❌ Error deleting template:", err);
        throw new Error(err.message || "Erro ao deletar template");
      }
    },
    [activeWorkspace]
  );

  /**
   * Toggle template active state
   */
  const toggleTemplate = useCallback(
    async (id: string, isActive: boolean, currentMonthId: string): Promise<void> => {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      // Update template active status
      await updateTemplate(id, { is_active: isActive });

      // If it's a card_purchase template, handle purchases
      if (template.type === 'card_purchase') {
        if (!isActive) {
          // Pausing: Remove purchases from future months (not current or past)
          console.log(`🔄 [toggleTemplate] Pausing template "${template.name}", removing future purchases...`);

          // Get all months from database
          const allMonths = await db.getAllMonths(activeWorkspace.id);

          // Filter for future months only (month_id > currentMonthId)
          const futureMonthIds = allMonths
            .filter(m => m.id > currentMonthId)
            .map(m => m.id);

          if (futureMonthIds.length > 0) {
            await db.deletePurchasesByTemplateAndMonth(id, futureMonthIds);
            console.log(`  ✅ Removed purchases from ${futureMonthIds.length} future months`);

            // Emit event to refresh UI
            dataEvents.emit('purchases:changed');
            syncNow();
          }
        } else {
          // Activating: Backfill purchases for all applicable months
          console.log(`🔄 [toggleTemplate] Activating template "${template.name}", backfilling purchases...`);

          // Call backfill function from useMonth (passed via context or directly)
          // For now, just trigger sync and the next month load will create them
          dataEvents.emit('templates:changed');
          syncNow();
        }
      }
    },
    [updateTemplate, templates, activeWorkspace, syncNow]
  );

  /**
   * Get active templates, optionally filtered by type
   */
  const getActiveTemplates = useCallback(
    (type?: "expense" | "card_purchase"): RecurringTemplate[] => {
      return templates.filter(
        (t) => t.is_active && (type ? t.type === type : true)
      );
    },
    [templates]
  );

  /**
   * Get template by ID
   */
  const getTemplateById = useCallback(
    (id: string): RecurringTemplate | null => {
      return templates.find((t) => t.id === id) || null;
    },
    [templates]
  );

  /**
   * Check if template should apply in a specific month based on frequency
   */
  function shouldApplyInMonth(
    template: RecurringTemplate,
    year: number,
    month: number // 1-12
  ): boolean {
    if (!template.is_active) return false;

    const targetDate = new Date(year, month - 1, 1);

    // Check start date
    if (template.start_date) {
      const startDate = new Date(template.start_date);
      if (targetDate < startDate) return false;
    }

    // Check end date
    if (template.end_date) {
      const endDate = new Date(template.end_date);
      if (targetDate > endDate) return false;
    }

    // Check skip_months in metadata
    const metadata = (template.metadata || {}) as any;
    if (metadata.skip_months && Array.isArray(metadata.skip_months)) {
      if (metadata.skip_months.includes(month)) return false;
    }

    // Check frequency
    const frequency = template.frequency || 'mensal';

    if (frequency === 'mensal') {
      return true;
    }

    if (frequency === 'anual') {
      if (!template.start_date) return true;
      const startDate = new Date(template.start_date);
      return month === startDate.getMonth() + 1;
    }

    // For bimestral, trimestral, semestral
    if (!template.start_date) return true;

    const startDate = new Date(template.start_date);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    const monthsSinceStart = (year - startYear) * 12 + (month - startMonth);

    if (monthsSinceStart < 0) return false;

    let interval = 1;
    if (frequency === 'bimestral') interval = 2;
    else if (frequency === 'trimestral') interval = 3;
    else if (frequency === 'semestral') interval = 6;

    return monthsSinceStart % interval === 0;
  }

  /**
   * Calculate which templates should apply to a given month
   */
  const calculateTemplatesForMonth = useCallback(
    (monthId: string): RecurringTemplate[] => {
      const [year, month] = monthId.split("-").map(Number);

      const filtered = templates.filter((template) => {
        return shouldApplyInMonth(template, year, month);
      });

      console.log(`🔍 [v2] ${filtered.length} templates apply to ${monthId}`);
      return filtered;
    },
    [templates]
  );

  /**
   * Refresh templates (reload from SQLite)
   */
  const refresh = useCallback(async () => {
    await loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
    getActiveTemplates,
    getTemplateById,
    calculateTemplatesForMonth,
    refresh,
  };
}
