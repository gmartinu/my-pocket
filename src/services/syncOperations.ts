/**
 * Sync Operations Service
 * Coordinates delete operations between Supabase and SQLite
 * Ensures data is deleted from remote first, then local
 */

import { supabase } from '../config/supabase';
import * as db from './database/operations';

/**
 * Delete expense instance (Supabase → SQLite)
 */
export async function deleteExpenseInstanceSync(
  id: string,
  workspaceId: string
): Promise<void> {
  // Delete from Supabase FIRST
  const { error } = await supabase
    .from('expense_instances')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('❌ Failed to delete expense from Supabase:', error);
    throw error;
  }

  console.log('✅ Deleted expense from Supabase:', id);

  // Then delete from local SQLite
  await db.deleteExpenseInstance(id);
  console.log('✅ Deleted expense from SQLite:', id);
}

/**
 * Delete recurring template (Supabase → SQLite)
 */
export async function deleteRecurringTemplateSync(
  id: string,
  workspaceId: string,
  currentMonthId?: string
): Promise<void> {
  // Delete expense instances from current month onwards (if provided)
  if (currentMonthId) {
    const { error: deleteInstancesError } = await supabase
      .from('expense_instances')
      .delete()
      .eq('template_id', id)
      .eq('workspace_id', workspaceId)
      .gte('month_id', currentMonthId);

    if (deleteInstancesError) {
      console.error('❌ Failed to delete expense instances from Supabase:', deleteInstancesError);
      throw deleteInstancesError;
    }

    console.log('✅ Deleted expense instances from Supabase for template:', id);

    // Delete from local SQLite
    await db.deleteExpenseInstancesByTemplateId(id, currentMonthId);
  }

  // Delete the template from Supabase
  const { error: deleteError } = await supabase
    .from('recurring_templates')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (deleteError) {
    console.error('❌ Failed to delete template from Supabase:', deleteError);
    throw deleteError;
  }

  console.log('✅ Deleted template from Supabase:', id);

  // Then delete from local SQLite
  await db.deleteRecurringTemplate(id);
  console.log('✅ Deleted template from SQLite:', id);
}

/**
 * Delete card (Supabase → SQLite)
 */
export async function deleteCardSync(
  id: string,
  workspaceId: string
): Promise<void> {
  // Delete from Supabase FIRST
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('❌ Failed to delete card from Supabase:', error);
    throw error;
  }

  console.log('✅ Deleted card from Supabase:', id);

  // Then delete from local SQLite
  await db.deleteCard(id);
  console.log('✅ Deleted card from SQLite:', id);
}

/**
 * Delete purchase (Supabase → SQLite)
 */
export async function deletePurchaseSync(id: string): Promise<void> {
  // Delete from Supabase FIRST
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to delete purchase from Supabase:', error);
    throw error;
  }

  console.log('✅ Deleted purchase from Supabase:', id);

  // Then delete from local SQLite
  await db.deletePurchase(id);
  console.log('✅ Deleted purchase from SQLite:', id);
}
