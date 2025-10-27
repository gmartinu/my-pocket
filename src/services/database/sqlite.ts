import * as SQLite from 'expo-sqlite';

// Database name
const DB_NAME = 'my_pocket.db';

// Open database
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize and open the SQLite database
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeTables();
  await runMigrations();

  console.log('📦 [SQLite] Database initialized and migrated');
  return db;
}

/**
 * Get the opened database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }
  return db;
}

/**
 * Create all necessary tables
 */
async function initializeTables(): Promise<void> {
  if (!db) return;

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Schema version tracking (always create this first)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if this is a fresh database (no tables yet)
  const tableCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT IN ('schema_version', 'sqlite_sequence')`
  );

  // Only create initial schema if database is empty
  if (tableCount && tableCount.count > 0) {
    console.log('✅ [SQLite] Tables already exist, skipping initial creation');
    return;
  }

  console.log('🆕 [SQLite] Creating initial tables...');

  // Months table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS months (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      saldo_inicial REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      needs_sync INTEGER DEFAULT 0
    );
  `);

  // Recurring templates table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recurring_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      value_formula TEXT NOT NULL,
      value_calculated REAL NOT NULL,
      frequency TEXT DEFAULT 'mensal',
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      needs_sync INTEGER DEFAULT 0
    );
  `);

  // Expense instances table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expense_instances (
      id TEXT PRIMARY KEY,
      month_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      template_id TEXT,
      name TEXT NOT NULL,
      value_planned TEXT NOT NULL,
      value_calculated REAL NOT NULL,
      is_paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      needs_sync INTEGER DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES recurring_templates(id) ON DELETE SET NULL
    );
  `);

  // Cards table (global per workspace, not per month)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_limit REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      needs_sync INTEGER DEFAULT 0
    );
  `);

  // Purchases table (belongs to a card and a month)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      month_id TEXT NOT NULL,
      description TEXT NOT NULL,
      total_value REAL NOT NULL,
      current_installment INTEGER DEFAULT 1,
      total_installments INTEGER DEFAULT 1,
      is_marked INTEGER DEFAULT 1,
      purchase_date TEXT,
      purchase_group_id TEXT,
      template_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      needs_sync INTEGER DEFAULT 0,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES recurring_templates(id) ON DELETE SET NULL
    );
  `);

  // Create indexes for better performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_months_workspace ON months(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_templates_workspace ON recurring_templates(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_month ON expense_instances(month_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON expense_instances(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_cards_workspace ON cards(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_card ON purchases(card_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_month ON purchases(month_id);
    CREATE INDEX IF NOT EXISTS idx_needs_sync ON expense_instances(needs_sync);
  `);

  console.log('✅ [SQLite] Tables and indexes created');
}

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  if (!db) return;

  // Get current schema version
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version WHERE id = 1'
  );

  const currentVersion = result?.version || 0;
  console.log(`📊 [SQLite] Current schema version: ${currentVersion}`);

  // Migration 1: Transform cards from per-month to global
  if (currentVersion < 1) {
    console.log('🔄 [SQLite] Running migration 1: Global cards + purchases with month_id');

    try {
      // Check if old schema exists (has month_id column in cards)
      const hasOldSchema = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM pragma_table_info('cards') WHERE name = 'month_id'`
      );

      if (hasOldSchema && hasOldSchema.count > 0) {
        console.log('  📦 Migrating existing data...');

        // Disable foreign keys temporarily
        await db.execAsync('PRAGMA foreign_keys = OFF;');

        // Create backup of existing cards and purchases
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cards_old AS SELECT * FROM cards;
          CREATE TABLE IF NOT EXISTS purchases_old AS SELECT * FROM purchases;
        `);

        // Drop old tables
        await db.execAsync(`
          DROP TABLE IF EXISTS purchases;
          DROP TABLE IF EXISTS cards;
        `);

        // Recreate with new schema
        await db.execAsync(`
          CREATE TABLE cards (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            total_limit REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            synced_at TEXT,
            needs_sync INTEGER DEFAULT 0
          );

          CREATE TABLE purchases (
            id TEXT PRIMARY KEY,
            card_id TEXT NOT NULL,
            month_id TEXT NOT NULL,
            description TEXT NOT NULL,
            total_value REAL NOT NULL,
            current_installment INTEGER DEFAULT 1,
            total_installments INTEGER DEFAULT 1,
            is_marked INTEGER DEFAULT 1,
            purchase_date TEXT,
            purchase_group_id TEXT,
            template_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            synced_at TEXT,
            needs_sync INTEGER DEFAULT 0,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES recurring_templates(id) ON DELETE SET NULL
          );
        `);

        // Migrate cards: Keep only unique cards per workspace (by name)
        // For each workspace+name combination, keep the first one (SQLite compatible)
        await db.execAsync(`
          INSERT INTO cards (id, workspace_id, name, total_limit, created_at, updated_at, synced_at, needs_sync)
          SELECT
            MIN(id) as id,
            workspace_id,
            name,
            MAX(total_limit) as total_limit,
            MIN(created_at) as created_at,
            MAX(updated_at) as updated_at,
            MAX(synced_at) as synced_at,
            MAX(needs_sync) as needs_sync
          FROM cards_old
          GROUP BY workspace_id, name;
        `);

        // Migrate purchases: Add month_id from old card's month_id
        // Link to the new consolidated card by matching workspace+name
        // First, create a temp mapping table
        await db.execAsync(`
          CREATE TEMP TABLE card_mapping AS
          SELECT c_old.id as old_id, c_new.id as new_id, c_old.month_id
          FROM cards_old c_old
          JOIN cards c_new ON c_new.workspace_id = c_old.workspace_id AND c_new.name = c_old.name;
        `);

        // Now insert purchases using the mapping
        await db.execAsync(`
          INSERT INTO purchases (
            id, card_id, month_id, description, total_value,
            current_installment, total_installments, is_marked,
            purchase_date, purchase_group_id, template_id,
            created_at, updated_at, synced_at, needs_sync
          )
          SELECT
            p.id,
            cm.new_id as card_id,
            cm.month_id,
            p.description,
            p.total_value,
            p.current_installment,
            p.total_installments,
            p.is_marked,
            p.purchase_date,
            p.purchase_group_id,
            p.template_id,
            p.created_at,
            p.updated_at,
            p.synced_at,
            p.needs_sync
          FROM purchases_old p
          JOIN card_mapping cm ON p.card_id = cm.old_id;
        `);

        // Recreate indexes
        await db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_cards_workspace ON cards(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_purchases_card ON purchases(card_id);
          CREATE INDEX IF NOT EXISTS idx_purchases_month ON purchases(month_id);
        `);

        // Drop backup tables
        await db.execAsync(`
          DROP TABLE IF EXISTS cards_old;
          DROP TABLE IF EXISTS purchases_old;
        `);

        // Re-enable foreign keys
        await db.execAsync('PRAGMA foreign_keys = ON;');

        console.log('  ✅ Migration 1 completed successfully');
      } else {
        console.log('  ℹ️ New database, no migration needed');
      }

      // Update schema version
      await db.execAsync(`
        INSERT OR REPLACE INTO schema_version (id, version, updated_at)
        VALUES (1, 1, CURRENT_TIMESTAMP);
      `);

    } catch (error) {
      console.error('  ❌ Migration 1 failed:', error);
      // Re-enable foreign keys even on error
      await db.execAsync('PRAGMA foreign_keys = ON;');
      throw error;
    }
  }

  console.log('✅ [SQLite] All migrations completed');
}

/**
 * Mark a record as needing synchronization
 */
export async function markForSync(table: string, id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE ${table} SET needs_sync = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  );
}

/**
 * Mark a record as synced
 */
export async function markAsSynced(table: string, id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE ${table} SET needs_sync = 0, synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  );
}

/**
 * Get all records that need synchronization
 */
export async function getUnsyncedRecords(table: string): Promise<any[]> {
  const db = getDatabase();
  const result = await db.getAllAsync(`SELECT * FROM ${table} WHERE needs_sync = 1`);
  return result || [];
}

/**
 * Clear all data from the database (for logout/workspace switch)
 */
export async function clearAllData(): Promise<void> {
  const db = getDatabase();
  await db.execAsync(`
    DELETE FROM purchases;
    DELETE FROM cards;
    DELETE FROM expense_instances;
    DELETE FROM recurring_templates;
    DELETE FROM months;
  `);
  console.log('🧹 [SQLite] All data cleared');
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('🔒 [SQLite] Database closed');
  }
}
