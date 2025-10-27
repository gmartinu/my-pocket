-- ============================================
-- Script para ZERAR DADOS do My Pocket
-- ============================================
-- ATENÇÃO: Este script deleta TODOS os dados de despesas,
-- cartões, compras e templates recorrentes.
-- Mantém apenas workspaces e usuários.
-- ============================================

-- 1. Deletar compras (depende de cards)
DELETE FROM purchases;

-- 2. Deletar cartões (depende de months)
DELETE FROM cards;

-- 3. Deletar instâncias de despesas (depende de months e templates)
DELETE FROM expense_instances;

-- 4. Deletar templates recorrentes
DELETE FROM recurring_templates;

-- 5. Deletar meses (depende de workspaces)
DELETE FROM months;

-- ============================================
-- Dados preservados:
-- ✅ workspaces
-- ✅ workspace_members
-- ✅ user_active_workspace
-- ✅ auth.users (gerenciado pelo Supabase)
-- ============================================

-- Verificar resultados
SELECT 'expense_instances' as tabela, COUNT(*) as registros FROM expense_instances
UNION ALL
SELECT 'recurring_templates', COUNT(*) FROM recurring_templates
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'cards', COUNT(*) FROM cards
UNION ALL
SELECT 'months', COUNT(*) FROM months
UNION ALL
SELECT 'workspaces', COUNT(*) FROM workspaces
UNION ALL
SELECT 'workspace_members', COUNT(*) FROM workspace_members;
