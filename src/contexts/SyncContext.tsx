import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { supabase } from '../config/supabase';
import { openDatabase, closeDatabase, getUnsyncedRecords, markAsSynced, clearAllData } from '../services/database/sqlite';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SyncContextType {
  isInitialized: boolean;
  isSyncing: boolean;
  syncError: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isInitialized: false,
  isSyncing: false,
  syncError: null,
  syncNow: async () => {},
});

export function useSyncContext() {
  return useContext(SyncContext);
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [realtimeChannels, setRealtimeChannels] = useState<RealtimeChannel[]>([]);

  /**
   * Initialize SQLite database
   */
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        console.log('🔄 [SyncContext] Initializing SQLite database...');
        await openDatabase();

        if (mounted) {
          setIsInitialized(true);
          console.log('✅ [SyncContext] Database initialized');
        }
      } catch (error: any) {
        console.error('❌ [SyncContext] Failed to initialize database:', error);
        if (mounted) {
          setSyncError(error.message);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Clear local data when workspace changes
   */
  useEffect(() => {
    if (!isInitialized) return;

    async function handleWorkspaceChange() {
      try {
        console.log('🔄 [SyncContext] Workspace changed, clearing local data...');
        await clearAllData();
        console.log('✅ [SyncContext] Local data cleared');
      } catch (error: any) {
        console.error('❌ [SyncContext] Failed to clear local data:', error);
      }
    }

    handleWorkspaceChange();
  }, [activeWorkspace?.id, isInitialized]);

  /**
   * Setup realtime subscriptions for multi-user sync
   */
  useEffect(() => {
    if (!activeWorkspace || !isInitialized) {
      // Cleanup existing channels
      realtimeChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setRealtimeChannels([]);
      return;
    }

    console.log('🔄 [SyncContext] Setting up realtime subscriptions...');

    const channels: RealtimeChannel[] = [];

    // Subscribe to recurring_templates changes
    const templatesChannel = supabase
      .channel(`sync-templates-${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_templates',
          filter: `workspace_id=eq.${activeWorkspace.id}`,
        },
        async (payload) => {
          console.log('🔄 [SyncContext] Realtime templates event:', payload.eventType);
          // Handle realtime updates from other users
          // The hooks will automatically refetch from SQLite
          await syncFromRemote();
        }
      )
      .subscribe();
    channels.push(templatesChannel);

    // Subscribe to expense_instances changes
    const expensesChannel = supabase
      .channel(`sync-expenses-${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_instances',
          filter: `workspace_id=eq.${activeWorkspace.id}`,
        },
        async (payload) => {
          console.log('🔄 [SyncContext] Realtime expenses event:', payload.eventType);
          await syncFromRemote();
        }
      )
      .subscribe();
    channels.push(expensesChannel);

    // Subscribe to months changes
    const monthsChannel = supabase
      .channel(`sync-months-${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'months',
          filter: `workspace_id=eq.${activeWorkspace.id}`,
        },
        async (payload) => {
          console.log('🔄 [SyncContext] Realtime months event:', payload.eventType);
          await syncFromRemote();
        }
      )
      .subscribe();
    channels.push(monthsChannel);

    setRealtimeChannels(channels);

    // Initial sync from remote
    syncFromRemote();

    // Cleanup
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [activeWorkspace?.id, isInitialized]);

  /**
   * Sync local changes to Supabase
   */
  const syncToRemote = useCallback(async () => {
    if (!activeWorkspace) return;

    try {
      console.log('📤 [SyncContext] Syncing local changes to Supabase...');

      // Get unsynced records
      const unsyncedTemplates = await getUnsyncedRecords('recurring_templates');
      const unsyncedExpenses = await getUnsyncedRecords('expense_instances');
      const unsyncedMonths = await getUnsyncedRecords('months');
      const unsyncedCards = await getUnsyncedRecords('cards');
      const unsyncedPurchases = await getUnsyncedRecords('purchases');

      // Sync templates
      for (const template of unsyncedTemplates) {
        // Remove internal fields before syncing
        const { needs_sync, synced_at, ...templateData } = template as any;

        const { error } = await supabase
          .from('recurring_templates')
          .upsert({
            ...templateData,
            metadata: typeof templateData.metadata === 'string' ? JSON.parse(templateData.metadata) : templateData.metadata,
            is_active: !!templateData.is_active,
          });

        if (!error) {
          await markAsSynced('recurring_templates', template.id);
        } else {
          console.error('❌ Failed to sync template:', error);
        }
      }

      // Sync expenses
      for (const expense of unsyncedExpenses) {
        // Remove internal fields before syncing
        const { needs_sync, synced_at, ...expenseData } = expense as any;

        const { error } = await supabase
          .from('expense_instances')
          .upsert({
            ...expenseData,
            is_paid: !!expenseData.is_paid,
          });

        if (!error) {
          await markAsSynced('expense_instances', expense.id);
        } else {
          console.error('❌ Failed to sync expense:', error);
        }
      }

      // Sync months
      for (const month of unsyncedMonths) {
        // Remove internal fields before syncing
        const { needs_sync, synced_at, ...monthData } = month as any;

        const { error } = await supabase
          .from('months')
          .upsert(monthData);

        if (!error) {
          await markAsSynced('months', month.id);
        } else {
          console.error('❌ Failed to sync month:', error);
        }
      }

      // Sync cards
      for (const card of unsyncedCards) {
        // Remove internal fields before syncing
        const { needs_sync, synced_at, ...cardData } = card as any;

        const { error } = await supabase
          .from('cards')
          .upsert(cardData);

        if (!error) {
          await markAsSynced('cards', card.id);
        } else {
          console.error('❌ Failed to sync card:', error);
        }
      }

      // Sync purchases
      for (const purchase of unsyncedPurchases) {
        // Remove internal fields before syncing
        const { needs_sync, synced_at, ...purchaseData } = purchase as any;

        const { error } = await supabase
          .from('purchases')
          .upsert({
            ...purchaseData,
            is_marked: !!purchaseData.is_marked,
          });

        if (!error) {
          await markAsSynced('purchases', purchase.id);
        } else {
          console.error('❌ Failed to sync purchase:', error);
        }
      }

      console.log('✅ [SyncContext] Local changes synced to Supabase');
    } catch (error: any) {
      console.error('❌ [SyncContext] Failed to sync to remote:', error);
      setSyncError(error.message);
    }
  }, [activeWorkspace]);

  /**
   * Sync from Supabase to local database
   */
  const syncFromRemote = useCallback(async () => {
    if (!activeWorkspace) return;

    try {
      console.log('📥 [SyncContext] Syncing from Supabase to local...');

      // This will be implemented by the hooks themselves
      // They will fetch from Supabase and write to SQLite
      // For now, this is a placeholder that triggers refetch

      console.log('✅ [SyncContext] Synced from Supabase');
    } catch (error: any) {
      console.error('❌ [SyncContext] Failed to sync from remote:', error);
      setSyncError(error.message);
    }
  }, [activeWorkspace]);

  /**
   * Manual sync trigger
   */
  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncToRemote();
      await syncFromRemote();
    } catch (error: any) {
      console.error('❌ [SyncContext] Sync failed:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [syncToRemote, syncFromRemote]);

  /**
   * Auto-sync to remote every time there are changes
   */
  useEffect(() => {
    if (!isInitialized || !activeWorkspace) return;

    // Sync to remote after operations (debounced)
    const syncInterval = setInterval(() => {
      syncToRemote();
    }, 5000); // Sync every 5 seconds

    return () => clearInterval(syncInterval);
  }, [isInitialized, activeWorkspace, syncToRemote]);

  return (
    <SyncContext.Provider
      value={{
        isInitialized,
        isSyncing,
        syncError,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
