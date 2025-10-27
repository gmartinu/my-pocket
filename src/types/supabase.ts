/**
 * Supabase Database Types
 * Re-exports from auto-generated types
 */

export type { Database, Json } from './database.types';

// Re-export helper types for easier usage
export type Tables<T extends keyof import('./database.types').Database['public']['Tables']> =
  import('./database.types').Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof import('./database.types').Database['public']['Tables']> =
  import('./database.types').Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof import('./database.types').Database['public']['Tables']> =
  import('./database.types').Database['public']['Tables'][T]['Update'];

// Export specific table types
export type Workspace = Tables<'workspaces'>;
export type WorkspaceInsert = TablesInsert<'workspaces'>;
export type WorkspaceUpdate = TablesUpdate<'workspaces'>;

export type WorkspaceMember = Tables<'workspace_members'>;
export type WorkspaceMemberInsert = TablesInsert<'workspace_members'>;
export type WorkspaceMemberUpdate = TablesUpdate<'workspace_members'>;

export type RecurringTemplate = Tables<'recurring_templates'>;
export type RecurringTemplateInsert = TablesInsert<'recurring_templates'>;
export type RecurringTemplateUpdate = TablesUpdate<'recurring_templates'>;

export type Month = Tables<'months'>;
export type MonthInsert = TablesInsert<'months'>;
export type MonthUpdate = TablesUpdate<'months'>;

export type ExpenseInstance = Tables<'expense_instances'>;
export type ExpenseInstanceInsert = TablesInsert<'expense_instances'>;
export type ExpenseInstanceUpdate = TablesUpdate<'expense_instances'>;

export type Card = Tables<'cards'>;
export type CardInsert = TablesInsert<'cards'>;
export type CardUpdate = TablesUpdate<'cards'>;

export type Purchase = Tables<'purchases'>;
export type PurchaseInsert = TablesInsert<'purchases'>;
export type PurchaseUpdate = TablesUpdate<'purchases'>;

// App-specific types (with computed fields)
export interface WorkspaceWithMembers extends Workspace {
  members?: WorkspaceMember[];
}

export interface MonthWithDetails extends Month {
  expenses?: ExpenseInstance[];
  cards?: CardWithPurchases[];
  total_expenses?: number;
  total_cards?: number;
  sobra?: number;
}

export interface CardWithPurchases extends Card {
  purchases?: Purchase[];
  total_fatura?: number;
}

// Template metadata type
export interface TemplateMetadata {
  categoria?: string;
  cor?: string;
  icone?: string;
  notas?: string;
  skip_months?: number[]; // Meses a pular (1-12). Ex: [3, 6] pula março e junho

  // Campos específicos para compras recorrentes (card_purchase)
  card_id?: string;  // ID do cartão onde a compra deve aparecer
  card_name?: string; // Nome do cartão (fallback se card_id não existir)
  parcelamento?: {
    total_installments: number;
  };
}

// Frequency type
export type RecurrenceFrequency =
  | 'mensal'      // Todo mês
  | 'bimestral'   // A cada 2 meses
  | 'trimestral'  // A cada 3 meses
  | 'semestral'   // A cada 6 meses
  | 'anual';      // Uma vez por ano (mesmo mês)

// Role type
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
