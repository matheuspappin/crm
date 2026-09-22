-- ============================================================
-- MIGRATION 009 — Approval Lifecycle & Hybrid Products
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- ATENÇÃO: Execute APÓS a 008_client_archive_and_delete_audit.sql
-- ============================================================

-- ============================================================
-- 1. TIPO ENUM: project_status
-- ============================================================
CREATE TYPE public.project_status AS ENUM (
  'em_desenvolvimento',
  'aguardando_aprovacao',
  'revisao_solicitada',
  'entregue'
);

-- ============================================================
-- 2. TABELA: projects (Atualizações de Colunas)
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN status public.project_status NOT NULL DEFAULT 'em_desenvolvimento',
  ADD COLUMN revision_notes TEXT;

-- Migração de Dados (se existirem projetos)
UPDATE public.projects
SET status = CASE
  WHEN is_delivered = true THEN 'entregue'::public.project_status
  ELSE 'em_desenvolvimento'::public.project_status
END;

-- Remover coluna antiga (CASCADE remove a view dependente)
ALTER TABLE public.projects DROP COLUMN is_delivered CASCADE;

COMMENT ON COLUMN public.projects.status IS 'Ciclo de aprovação do projeto de desenvolvimento';
COMMENT ON COLUMN public.projects.revision_notes IS 'Notas de mudança solicitadas pelo cliente/vendedor';

-- ============================================================
-- 2.1 RECRIAR VIEW: Dashboard Executivo (Atualizada)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_executive_dashboard AS
SELECT
  -- MRR do mês atual
  (
    SELECT total_revenue FROM public.mv_mrr
    WHERE month = DATE_TRUNC('month', NOW())::DATE
    LIMIT 1
  ) AS current_mrr,
  -- Total de leads ativos (não fechados e não perdidos)
  (
    SELECT COUNT(*) FROM public.leads
    WHERE status NOT IN ('fechado', 'perdido')
  ) AS active_leads,
  -- Win rate do mês atual
  (
    SELECT win_rate_percent FROM public.mv_win_rate
    WHERE month = DATE_TRUNC('month', NOW())::DATE
    LIMIT 1
  ) AS current_win_rate,
  -- Pipeline velocity do mês atual
  (
    SELECT avg_days_to_close FROM public.mv_pipeline_velocity
    WHERE month = DATE_TRUNC('month', NOW())::DATE
    LIMIT 1
  ) AS current_avg_days,
  -- CAC médio geral
  (
    SELECT AVG(cac) FROM public.mv_cac WHERE cac > 0
  ) AS avg_cac,
  -- Projetos em andamento (Atualizado para a nova coluna status)
  (
    SELECT COUNT(*) FROM public.projects WHERE status != 'entregue'
  ) AS projects_in_progress,
  -- Projetos com problema de pixel
  (
    SELECT COUNT(*) FROM public.projects WHERE pixel_status IN ('warning', 'error')
  ) AS pixel_issues,
  -- Timestamp do último refresh
  NOW() AS dashboard_at;

COMMENT ON VIEW public.vw_executive_dashboard IS
  'Snapshot executivo para o God Mode — combina todas as MVs em uma única query';

-- ============================================================
-- 3. TABELA: traffic_onboarding (Garantia de Existência)
-- (Caso tenha sido criada apenas via Supabase UI, documenta aqui)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.traffic_onboarding (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  meta_ads_url    TEXT,
  google_ads_url  TEXT,
  daily_budget    NUMERIC(12, 2),
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_traffic_manager UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TRIGGER: Criação inteligente baseada em service_type
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_lead_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    
    -- Verifica service_type (cai para 'dev' como default para legibilidade com registros antigos)
    IF COALESCE(NEW.service_type::text, 'dev') IN ('dev', 'ambos') THEN
      INSERT INTO public.projects (lead_id)
      VALUES (NEW.id)
      ON CONFLICT (lead_id) DO NOTHING;
    END IF;

    IF COALESCE(NEW.service_type::text, 'dev') IN ('trafego', 'ambos') THEN
      INSERT INTO public.traffic_onboarding (lead_id)
      VALUES (NEW.id)
      ON CONFLICT (lead_id) DO NOTHING;
    END IF;

    -- Log do evento
    INSERT INTO public.system_logs (event, payload, source)
    VALUES (
      'project_created',
      jsonb_build_object(
        'lead_id', NEW.id,
        'lead_name', NEW.name,
        'lead_value', NEW.value,
        'service_type', NEW.service_type
      ),
      'trigger:handle_lead_closed'
    );
  END IF;
  RETURN NEW;
END;
$$;
