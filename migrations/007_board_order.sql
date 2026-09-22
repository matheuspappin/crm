-- ============================================================
-- MIGRATION 007 — Ordem do Kanban
-- CRM God Mode | Agência de Marketing
-- ============================================================

-- Adiciona a coluna board_order para salvar a posição do drag-and-drop
ALTER TABLE public.leads 
ADD COLUMN board_order DOUBLE PRECISION DEFAULT 0;

-- Atualiza os leads existentes para manterem a ordem atual do Kanban
-- O Kanban atual ordena por created_at DESC, então mantemos isso como base
WITH ordered_leads AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) * 1024 as new_order
  FROM public.leads
)
UPDATE public.leads l
SET board_order = o.new_order
FROM ordered_leads o
WHERE l.id = o.id;

-- Cria um índice para otimizar o carregamento do Kanban
CREATE INDEX IF NOT EXISTS idx_leads_board_order ON public.leads(status, board_order ASC);
