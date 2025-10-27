-- My Pocket - Supabase Database Schema
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (gerenciada pelo Supabase Auth, mas criamos referência)
-- A tabela auth.users já existe, criamos apenas perfis extras se necessário

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT workspace_name_not_empty CHECK (LENGTH(TRIM(name)) >= 3)
);

-- Workspace Members (para compartilhamento)
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (workspace_id, user_id)
);

-- User active workspace (qual workspace está ativo)
CREATE TABLE user_active_workspace (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring Templates (templates de despesas/compras recorrentes)
CREATE TABLE recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'card_purchase')),
  name TEXT NOT NULL,
  value_formula TEXT NOT NULL, -- "100" ou "100+50"
  value_calculated DECIMAL(10, 2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('mensal', 'semanal', 'quinzenal', 'anual')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- categoria, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT template_name_not_empty CHECK (LENGTH(TRIM(name)) >= 2)
);

-- Months (criados sob demanda quando usuário navega)
CREATE TABLE months (
  id TEXT PRIMARY KEY, -- "2025-10"
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Outubro 2025"
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  saldo_inicial DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(workspace_id, id)
);

-- Expense Instances (instâncias de despesas no mês)
CREATE TABLE expense_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_id TEXT NOT NULL,
  workspace_id UUID NOT NULL,
  template_id UUID REFERENCES recurring_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value_planned TEXT NOT NULL,
  value_calculated DECIMAL(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (workspace_id, month_id) REFERENCES months(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT expense_name_not_empty CHECK (LENGTH(TRIM(name)) >= 2)
);

-- Cards (cartões de crédito globais por workspace)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  total_limit DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT card_name_not_empty CHECK (LENGTH(TRIM(name)) >= 2)
);

-- Purchases (compras no cartão por mês)
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  month_id TEXT NOT NULL,
  template_id UUID REFERENCES recurring_templates(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_value DECIMAL(10, 2) NOT NULL,
  current_installment INT NOT NULL DEFAULT 1,
  total_installments INT NOT NULL DEFAULT 1,
  purchase_group_id UUID, -- agrupa parcelas da mesma compra
  is_marked BOOLEAN DEFAULT TRUE,
  purchase_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT purchase_desc_not_empty CHECK (LENGTH(TRIM(description)) >= 2),
  CONSTRAINT valid_installments CHECK (current_installment >= 1 AND current_installment <= total_installments),
  CONSTRAINT valid_total_installments CHECK (total_installments >= 1)
);

-- ============================================================================
-- INDEXES (para performance)
-- ============================================================================

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_recurring_templates_workspace ON recurring_templates(workspace_id);
CREATE INDEX idx_recurring_templates_active ON recurring_templates(workspace_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_months_workspace ON months(workspace_id);
CREATE INDEX idx_months_date ON months(workspace_id, year, month);
CREATE INDEX idx_expense_instances_month ON expense_instances(workspace_id, month_id);
CREATE INDEX idx_expense_instances_template ON expense_instances(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_cards_workspace ON cards(workspace_id);
CREATE INDEX idx_purchases_card ON purchases(card_id);
CREATE INDEX idx_purchases_month ON purchases(month_id);
CREATE INDEX idx_purchases_group ON purchases(purchase_group_id) WHERE purchase_group_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE months ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Workspaces: usuário vê apenas workspaces que possui ou é membro
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = workspaces.id)
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = owner_id);

-- Workspace Members: usuário vê membros dos workspaces que tem acesso
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage workspace members"
  ON workspace_members FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- User Active Workspace
CREATE POLICY "Users can manage own active workspace"
  ON user_active_workspace FOR ALL
  USING (auth.uid() = user_id);

-- Recurring Templates: usuário vê templates dos workspaces que tem acesso
CREATE POLICY "Users can view workspace templates"
  ON recurring_templates FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage templates"
  ON recurring_templates FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Months: usuário vê meses dos workspaces que tem acesso
CREATE POLICY "Users can view workspace months"
  ON months FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage months"
  ON months FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Expense Instances
CREATE POLICY "Users can view workspace expenses"
  ON expense_instances FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage expenses"
  ON expense_instances FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Cards
CREATE POLICY "Users can view workspace cards"
  ON cards FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage cards"
  ON cards FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Purchases
CREATE POLICY "Users can view workspace purchases"
  ON purchases FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM cards WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can manage purchases"
  ON purchases FOR ALL
  USING (
    card_id IN (
      SELECT id FROM cards WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_templates_updated_at BEFORE UPDATE ON recurring_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_months_updated_at BEFORE UPDATE ON months
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_instances_updated_at BEFORE UPDATE ON expense_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS (para queries complexas de relatórios)
-- ============================================================================

-- View para calcular totais de meses
CREATE OR REPLACE VIEW month_totals AS
SELECT
  m.id AS month_id,
  m.workspace_id,
  m.name AS month_name,
  m.saldo_inicial,
  COALESCE(SUM(e.value_calculated), 0) AS total_expenses,
  COALESCE(SUM(p.total_value / p.total_installments), 0) AS total_cards,
  m.saldo_inicial - COALESCE(SUM(e.value_calculated), 0) - COALESCE(SUM(p.total_value / p.total_installments), 0) AS sobra
FROM months m
LEFT JOIN expense_instances e ON e.month_id = m.id AND e.workspace_id = m.workspace_id
LEFT JOIN cards c ON c.month_id = m.id AND c.workspace_id = m.workspace_id
LEFT JOIN purchases p ON p.card_id = c.id AND p.is_marked = TRUE
GROUP BY m.id, m.workspace_id, m.name, m.saldo_inicial;

-- ============================================================================
-- REALTIME (habilitar para subscriptions)
-- ============================================================================

-- Habilitar realtime publication para as tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE months;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_templates;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Schema criado com sucesso!
-- Agora você pode começar a migrar os dados do Firebase.
