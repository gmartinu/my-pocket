import { getDatabase, markForSync } from './sqlite';
import { generateUUID } from '../../utils/uuid';
import type {
  Month,
  RecurringTemplate,
  ExpenseInstance,
  Card,
  Purchase,
} from '../../types/supabase';

// Generate UUID
function generateId(): string {
  return generateUUID();
}

// ============================================
// MONTHS
// ============================================

export async function insertMonth(month: Month): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO months
    (id, workspace_id, name, year, month, saldo_inicial, created_at, updated_at, needs_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      month.id,
      month.workspace_id,
      month.name,
      month.year,
      month.month,
      month.saldo_inicial ?? 0,
      month.created_at ?? new Date().toISOString(),
      month.updated_at ?? new Date().toISOString(),
    ]
  );
}

export async function getMonthById(monthId: string, workspaceId: string): Promise<Month | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<Month>(
    'SELECT * FROM months WHERE id = ? AND workspace_id = ?',
    [monthId, workspaceId]
  );
  return result || null;
}

export async function getAllMonths(workspaceId: string): Promise<Month[]> {
  const db = getDatabase();
  const results = await db.getAllAsync<Month>(
    'SELECT * FROM months WHERE workspace_id = ? ORDER BY year DESC, month DESC',
    [workspaceId]
  );
  return results || [];
}

export async function updateMonth(monthId: string, data: Partial<Month>): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.saldo_inicial !== undefined) {
    updates.push('saldo_inicial = ?');
    values.push(data.saldo_inicial);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP', 'needs_sync = 1');
  values.push(monthId);

  await db.runAsync(
    `UPDATE months SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

// ============================================
// RECURRING TEMPLATES
// ============================================

export async function insertRecurringTemplate(template: RecurringTemplate): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO recurring_templates
    (id, workspace_id, type, name, value_formula, value_calculated, frequency, start_date, end_date, is_active, metadata, created_at, updated_at, needs_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      template.id || generateId(),
      template.workspace_id,
      template.type,
      template.name,
      template.value_formula,
      template.value_calculated,
      template.frequency ?? 'mensal',
      template.start_date,
      template.end_date,
      template.is_active ? 1 : 0,
      JSON.stringify(template.metadata || {}),
      template.created_at ?? new Date().toISOString(),
      template.updated_at ?? new Date().toISOString(),
    ]
  );
}

export async function getAllRecurringTemplates(workspaceId: string): Promise<RecurringTemplate[]> {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM recurring_templates WHERE workspace_id = ? ORDER BY created_at DESC',
    [workspaceId]
  );

  // Parse metadata and convert booleans
  return (results || []).map(row => ({
    ...row,
    is_active: !!row.is_active,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
  }));
}

export async function getRecurringTemplateById(id: string): Promise<RecurringTemplate | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM recurring_templates WHERE id = ?',
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    is_active: !!result.is_active,
    metadata: result.metadata ? JSON.parse(result.metadata) : {},
  };
}

export async function updateRecurringTemplate(id: string, data: Partial<RecurringTemplate>): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.value_formula !== undefined) {
    updates.push('value_formula = ?');
    values.push(data.value_formula);
  }
  if (data.value_calculated !== undefined) {
    updates.push('value_calculated = ?');
    values.push(data.value_calculated);
  }
  if (data.frequency !== undefined) {
    updates.push('frequency = ?');
    values.push(data.frequency);
  }
  if (data.start_date !== undefined) {
    updates.push('start_date = ?');
    values.push(data.start_date);
  }
  if (data.end_date !== undefined) {
    updates.push('end_date = ?');
    values.push(data.end_date);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }
  if (data.metadata !== undefined) {
    updates.push('metadata = ?');
    values.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP', 'needs_sync = 1');
  values.push(id);

  await db.runAsync(
    `UPDATE recurring_templates SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM recurring_templates WHERE id = ?', [id]);
}

// ============================================
// EXPENSE INSTANCES
// ============================================

export async function insertExpenseInstance(expense: ExpenseInstance): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO expense_instances
    (id, month_id, workspace_id, template_id, name, value_planned, value_calculated, is_paid, created_at, updated_at, needs_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      expense.id || generateId(),
      expense.month_id,
      expense.workspace_id,
      expense.template_id,
      expense.name,
      expense.value_planned,
      expense.value_calculated,
      expense.is_paid ? 1 : 0,
      expense.created_at ?? new Date().toISOString(),
      expense.updated_at ?? new Date().toISOString(),
    ]
  );
}

export async function getAllExpenseInstances(monthId: string, workspaceId: string): Promise<ExpenseInstance[]> {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM expense_instances WHERE month_id = ? AND workspace_id = ? ORDER BY created_at ASC',
    [monthId, workspaceId]
  );

  return (results || []).map(row => ({
    ...row,
    is_paid: !!row.is_paid,
  }));
}

export async function updateExpenseInstance(id: string, data: Partial<ExpenseInstance>): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.value_planned !== undefined) {
    updates.push('value_planned = ?');
    values.push(data.value_planned);
  }
  if (data.value_calculated !== undefined) {
    updates.push('value_calculated = ?');
    values.push(data.value_calculated);
  }
  if (data.is_paid !== undefined) {
    updates.push('is_paid = ?');
    values.push(data.is_paid ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP', 'needs_sync = 1');
  values.push(id);

  await db.runAsync(
    `UPDATE expense_instances SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteExpenseInstance(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM expense_instances WHERE id = ?', [id]);
}

export async function deleteExpenseInstancesByTemplateId(templateId: string, monthId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'DELETE FROM expense_instances WHERE template_id = ? AND month_id >= ?',
    [templateId, monthId]
  );
}

// ============================================
// CARDS
// ============================================

export async function insertCard(card: Card): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO cards
    (id, workspace_id, name, total_limit, created_at, updated_at, needs_sync)
    VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      card.id || generateId(),
      card.workspace_id,
      card.name,
      card.total_limit ?? 0,
      card.created_at ?? new Date().toISOString(),
      card.updated_at ?? new Date().toISOString(),
    ]
  );
}

export async function getAllCards(workspaceId: string): Promise<Card[]> {
  const db = getDatabase();
  const results = await db.getAllAsync<Card>(
    'SELECT * FROM cards WHERE workspace_id = ? ORDER BY created_at ASC',
    [workspaceId]
  );
  return results || [];
}

export async function updateCard(id: string, data: Partial<Card>): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.total_limit !== undefined) {
    updates.push('total_limit = ?');
    values.push(data.total_limit);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP', 'needs_sync = 1');
  values.push(id);

  await db.runAsync(
    `UPDATE cards SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteCard(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

// ============================================
// PURCHASES
// ============================================

export async function insertPurchase(purchase: Purchase): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO purchases
    (id, card_id, month_id, description, total_value, current_installment, total_installments, is_marked, purchase_date, purchase_group_id, template_id, created_at, updated_at, needs_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      purchase.id || generateId(),
      purchase.card_id,
      purchase.month_id,
      purchase.description,
      purchase.total_value,
      purchase.current_installment ?? 1,
      purchase.total_installments ?? 1,
      purchase.is_marked ? 1 : 0,
      purchase.purchase_date ?? new Date().toISOString().split('T')[0],
      purchase.purchase_group_id,
      purchase.template_id,
      purchase.created_at ?? new Date().toISOString(),
      purchase.updated_at ?? new Date().toISOString(),
    ]
  );
}

export async function getAllPurchasesByCard(cardId: string): Promise<Purchase[]> {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM purchases WHERE card_id = ?',
    [cardId]
  );

  return (results || []).map(row => ({
    ...row,
    is_marked: !!row.is_marked,
  }));
}

export async function getAllPurchasesByCardAndMonth(cardId: string, monthId: string): Promise<Purchase[]> {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM purchases WHERE card_id = ? AND month_id = ?',
    [cardId, monthId]
  );

  return (results || []).map(row => ({
    ...row,
    is_marked: !!row.is_marked,
  }));
}

export async function deletePurchasesByTemplateAndMonth(templateId: string, monthIds: string[]): Promise<void> {
  const db = getDatabase();
  const placeholders = monthIds.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM purchases WHERE template_id = ? AND month_id IN (${placeholders})`,
    [templateId, ...monthIds]
  );
}

export async function updatePurchase(id: string, data: Partial<Purchase>): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.total_value !== undefined) {
    updates.push('total_value = ?');
    values.push(data.total_value);
  }
  if (data.current_installment !== undefined) {
    updates.push('current_installment = ?');
    values.push(data.current_installment);
  }
  if (data.total_installments !== undefined) {
    updates.push('total_installments = ?');
    values.push(data.total_installments);
  }
  if (data.is_marked !== undefined) {
    updates.push('is_marked = ?');
    values.push(data.is_marked ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP', 'needs_sync = 1');
  values.push(id);

  await db.runAsync(
    `UPDATE purchases SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deletePurchase(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM purchases WHERE id = ?', [id]);
}
