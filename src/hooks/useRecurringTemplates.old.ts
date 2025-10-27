import { useState, useEffect, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { useWorkspace } from "../contexts/WorkspaceContext";
import {
  RecurringTemplate,
  RecurringTemplateInsert,
  RecurringTemplateUpdate,
  RecurrenceFrequency,
} from "../types/supabase";
import { evaluateFormula } from "../utils/calculations";

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
  deleteTemplate: (id: string) => Promise<void>;
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

/**
 * Hook to manage recurring templates
 */
export function useRecurringTemplates(): UseRecurringTemplatesReturn {
  const { activeWorkspace } = useWorkspace();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] =
    useState<RealtimeChannel | null>(null);

  /**
   * Load templates from Supabase
   */
  const loadTemplates = useCallback(async () => {
    if (!activeWorkspace) return;

    try {
      setLoading(true);
      setError(null);

      console.log("📋 [useRecurringTemplates] Loading templates for workspace:", activeWorkspace.id);

      const { data, error: queryError } = await supabase
        .from("recurring_templates")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      console.log("📋 [useRecurringTemplates] Loaded", data?.length || 0, "templates");
      setTemplates(data || []);
    } catch (err: any) {
      console.error("❌ Error loading templates:", err);
      setError(err.message || "Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  // Load templates when workspace changes
  useEffect(() => {
    if (!activeWorkspace) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    loadTemplates();
  }, [activeWorkspace?.id, loadTemplates]);

  /**
   * Handle real-time changes
   */
  const handleRealtimeChange = useCallback((payload: any) => {
    console.log("🔄 [useRecurringTemplates] Realtime event:", payload.eventType, payload);
    switch (payload.eventType) {
      case "INSERT":
        setTemplates((prev) => {
          console.log("➕ Adding template:", payload.new.name);
          return [...prev, payload.new as RecurringTemplate];
        });
        break;
      case "UPDATE":
        setTemplates((prev) => {
          console.log("✏️ Updating template:", payload.new.name);
          return prev.map((t) =>
            t.id === payload.new.id ? (payload.new as RecurringTemplate) : t
          );
        });
        break;
      case "DELETE":
        setTemplates((prev) => {
          console.log("🗑️ Deleting template:", payload.old.id);
          return prev.filter((t) => t.id !== payload.old.id);
        });
        break;
    }
  }, []);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!activeWorkspace) {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
      }
      return;
    }

    // Subscribe to template changes
    const channel = supabase
      .channel(`templates-${activeWorkspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recurring_templates",
          filter: `workspace_id=eq.${activeWorkspace.id}`,
        },
        (payload) => {
          handleRealtimeChange(payload);
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeWorkspace?.id, handleRealtimeChange]);

  /**
   * Create a new template
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

        const { data, error: insertError } = await supabase
          .from("recurring_templates")
          .insert({
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
          })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log("✅ Template created:", data.id);
        return data;
      } catch (err: any) {
        console.error("❌ Error creating template:", err);
        throw new Error(err.message || "Erro ao criar template");
      }
    },
    [activeWorkspace]
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

        const { error: updateError } = await supabase
          .from("recurring_templates")
          .update(updateData)
          .eq("id", id)
          .eq("workspace_id", activeWorkspace.id);

        if (updateError) throw updateError;

        console.log("✅ Template updated:", id);
      } catch (err: any) {
        console.error("❌ Error updating template:", err);
        throw new Error(err.message || "Erro ao atualizar template");
      }
    },
    [activeWorkspace]
  );

  /**
   * Delete a template and its future expense instances
   */
  const deleteTemplate = useCallback(
    async (id: string, currentMonthId?: string): Promise<void> => {
      if (!activeWorkspace) throw new Error("No active workspace");

      try {
        // Delete expense instances from current month onwards
        if (currentMonthId) {
          const { error: deleteInstancesError } = await supabase
            .from("expense_instances")
            .delete()
            .eq("template_id", id)
            .eq("workspace_id", activeWorkspace.id)
            .gte("month_id", currentMonthId);

          if (deleteInstancesError) {
            console.error("❌ Error deleting expense instances:", deleteInstancesError);
            throw deleteInstancesError;
          }

          console.log("✅ Deleted expense instances from", currentMonthId, "onwards");
        }

        // Delete the template
        const { error: deleteError } = await supabase
          .from("recurring_templates")
          .delete()
          .eq("id", id)
          .eq("workspace_id", activeWorkspace.id);

        if (deleteError) throw deleteError;

        console.log("✅ Template deleted:", id);
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
    async (id: string, isActive: boolean): Promise<void> => {
      await updateTemplate(id, { is_active: isActive });
    },
    [updateTemplate]
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
    console.log(`\n🧮 [shouldApplyInMonth] ========== CHECKING "${template.name}" ==========`);
    console.log(`🧮 Target: ${year}-${String(month).padStart(2, '0')} (${year}/${month})`);
    console.log("🧮 Template config:", {
      is_active: template.is_active,
      start_date: template.start_date,
      end_date: template.end_date,
      frequency: template.frequency
    });

    if (!template.is_active) {
      console.log("🧮 ❌ Result: FALSE - Template is not active");
      return false;
    }

    const targetDate = new Date(year, month - 1, 1);
    console.log("🧮 targetDate:", targetDate.toISOString().split('T')[0], `(${targetDate.toISOString()})`);

    // Check start date
    if (template.start_date) {
      const startDate = new Date(template.start_date);
      console.log("🧮 startDate:", startDate.toISOString().split('T')[0], `(${startDate.toISOString()})`);
      console.log("🧮 targetDate < startDate?", targetDate < startDate);

      if (targetDate < startDate) {
        console.log("🧮 ❌ Result: FALSE - Target is before start date");
        return false;
      }
    }

    // Check end date
    if (template.end_date) {
      const endDate = new Date(template.end_date);
      console.log("🧮 endDate:", endDate.toISOString().split('T')[0], `(${endDate.toISOString()})`);
      console.log("🧮 targetDate > endDate?", targetDate > endDate);

      if (targetDate > endDate) {
        console.log("🧮 ❌ Result: FALSE - Target is after end date");
        return false;
      }
    }

    // Check skip_months in metadata
    const metadata = (template.metadata || {}) as any;
    if (metadata.skip_months && Array.isArray(metadata.skip_months)) {
      console.log("🧮 skip_months:", metadata.skip_months);
      if (metadata.skip_months.includes(month)) {
        console.log("🧮 ❌ Result: FALSE - Month is in skip list");
        return false; // Skip this month
      }
    }

    // Check frequency
    const frequency = template.frequency || 'mensal';
    console.log("🧮 Checking frequency:", frequency);

    if (frequency === 'mensal') {
      console.log("🧮 ✅ Result: TRUE - Mensal frequency (applies every month)");
      return true; // Applies every month
    }

    if (frequency === 'anual') {
      // Applies once per year, in the same month as start_date
      if (!template.start_date) {
        console.log("🧮 ✅ Result: TRUE - Anual with no start_date");
        return true;
      }
      const startDate = new Date(template.start_date);
      const startMonth = startDate.getMonth() + 1;
      const applies = month === startMonth;
      console.log("🧮 Anual check: target month", month, "vs start month", startMonth, "=", applies);
      console.log(`🧮 ${applies ? '✅' : '❌'} Result:`, applies);
      return applies;
    }

    // For bimestral, trimestral, semestral: calculate months since start_date
    if (!template.start_date) {
      console.log("🧮 ✅ Result: TRUE - No start_date for interval frequency");
      return true;
    }

    const startDate = new Date(template.start_date);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // 1-12

    // Calculate total months since start_date
    const monthsSinceStart = (year - startYear) * 12 + (month - startMonth);
    console.log("🧮 Months since start:", monthsSinceStart, `(${year}-${month} minus ${startYear}-${startMonth})`);

    if (monthsSinceStart < 0) {
      console.log("🧮 ❌ Result: FALSE - Before start date (negative months)");
      return false; // Before start date
    }

    // Check based on frequency interval
    let interval = 1;
    if (frequency === 'bimestral') interval = 2;
    else if (frequency === 'trimestral') interval = 3;
    else if (frequency === 'semestral') interval = 6;

    const applies = monthsSinceStart % interval === 0;
    console.log("🧮 Interval check:", frequency, "interval:", interval);
    console.log("🧮", monthsSinceStart, "%", interval, "=", monthsSinceStart % interval);
    console.log(`🧮 ${applies ? '✅' : '❌'} Result:`, applies);

    return applies;
  }

  /**
   * Calculate which templates should apply to a given month
   */
  const calculateTemplatesForMonth = useCallback(
    (monthId: string): RecurringTemplate[] => {
      console.log("\n🔍 [calculateTemplatesForMonth] ========== CALCULATING ==========");
      console.log("🔍 [calculateTemplatesForMonth] Called with monthId:", monthId);

      const [year, month] = monthId.split("-").map(Number);
      console.log("🔍 [calculateTemplatesForMonth] Parsed - Year:", year, "Month:", month);
      console.log("🔍 [calculateTemplatesForMonth] Total templates available:", templates.length);

      if (templates.length > 0) {
        console.log("🔍 [calculateTemplatesForMonth] All templates:", templates.map(t => ({
          name: t.name,
          start: t.start_date,
          end: t.end_date,
          active: t.is_active,
          frequency: t.frequency
        })));
      }

      const filtered = templates.filter((template) => {
        const applies = shouldApplyInMonth(template, year, month);
        console.log(`🔍 [calculateTemplatesForMonth] Template "${template.name}" applies to ${monthId}?`, applies ? "✅ YES" : "❌ NO");
        return applies;
      });

      console.log("🔍 [calculateTemplatesForMonth] Filtered result:", filtered.length, "templates");
      console.log("🔍 [calculateTemplatesForMonth] ========== END ==========\n");

      return filtered;
    },
    [templates]
  );

  /**
   * Refresh templates
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
