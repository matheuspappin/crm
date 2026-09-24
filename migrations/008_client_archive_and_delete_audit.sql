-- ============================================================
-- MIGRATION 008 — Archive de Clientes & Audit de Exclusão
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- ATENÇÃO: Execute APÓS a 007_board_order.sql
-- ============================================================

-- ============================================================
-- ENUM: Motivo de encerramento de projeto
-- ============================================================

CREATE TYPE public.delete_reason AS ENUM (
  'cliente_cancelou',
  'projeto_parado',
  'inadimplencia',
  'escopo_nao_aprovado',
  'outro'
);

-- ============================================================
-- TABELA: project_deletions
-- Audit log permanente de encerramentos de projetos pelo owner
-- Nunca é deletada — serve como documentação oficial
-- ============================================================

CREATE TABLE public.project_deletions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID,                                        -- NULL se hard-delete (projeto removido)
  project_type    TEXT NOT NULL CHECK (project_type IN ('dev', 'trafego')),
  lead_id         UUID,                                        -- Referência ao lead (mantida mesmo após hard-delete)
  lead_name       TEXT NOT NULL,                               -- Cópia desnormalizada para auditoria
  lead_value      NUMERIC(12, 2),                              -- Cópia desnormalizada
  delete_type     TEXT NOT NULL CHECK (delete_type IN ('soft', 'hard')),
  reason          public.delete_reason NOT NULL,
  notes           TEXT NOT NULL,                               -- Observação detalhada obrigatória
  deleted_by      UUID NOT NULL REFERENCES public.users(id),  -- Quem encerrou
  deleted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_deletions_project_id  ON public.project_deletions(project_id);
CREATE INDEX idx_project_deletions_lead_id     ON public.project_deletions(lead_id);
CREATE INDEX idx_project_deletions_deleted_by  ON public.project_deletions(deleted_by);
CREATE INDEX idx_project_deletions_deleted_at  ON public.project_deletions(deleted_at DESC);
CREATE INDEX idx_project_deletions_delete_type ON public.project_deletions(delete_type);

COMMENT ON TABLE public.project_deletions IS 'Audit log permanente de projetos encerrados pelo owner. Nunca excluir registros desta tabela.';
COMMENT ON COLUMN public.project_deletions.project_id IS 'NULL quando delete_type = hard (registro de projects/traffic_onboarding foi removido fisicamente)';
COMMENT ON COLUMN public.project_deletions.delete_type IS 'soft = registro ocultado; hard = registro removido permanentemente';

-- ============================================================
-- ALTER TABLE: projects — Colunas de soft-delete
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN deleted_at     TIMESTAMPTZ,
  ADD COLUMN deleted_reason public.delete_reason,
  ADD COLUMN deleted_notes  TEXT,
  ADD COLUMN deleted_by     UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_deleted_at ON public.projects(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.projects.deleted_at     IS 'NULL = ativo; preenchido = soft-deleted';
COMMENT ON COLUMN public.projects.deleted_reason IS 'Motivo categorizado do encerramento';
COMMENT ON COLUMN public.projects.deleted_notes  IS 'Observação detalhada obrigatória do owner';
COMMENT ON COLUMN public.projects.deleted_by     IS 'Owner que executou o encerramento';

-- ============================================================
-- ALTER TABLE: traffic_onboarding — Colunas de soft-delete
-- ============================================================

ALTER TABLE public.traffic_onboarding
  ADD COLUMN deleted_at     TIMESTAMPTZ,
  ADD COLUMN deleted_reason public.delete_reason,
  ADD COLUMN deleted_notes  TEXT,
  ADD COLUMN deleted_by     UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_traffic_deleted_at ON public.traffic_onboarding(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.traffic_onboarding.deleted_at IS 'NULL = ativo; preenchido = soft-deleted';

-- ============================================================
-- RLS: project_deletions
-- Somente owner lê/grava; auditoria é SECURITY DEFINER
-- ============================================================

ALTER TABLE public.project_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_deletions: owner full access"
  ON public.project_deletions
  FOR ALL
  USING (public.current_user_role() = 'owner');

-- ============================================================
-- FUNÇÃO: owner_soft_delete_project
-- Faz soft-delete + grava audit em transação atômica
-- Tipo: 'dev' ou 'trafego'
-- ============================================================

CREATE OR REPLACE FUNCTION public.owner_soft_delete_project(
  p_project_id UUID,
  p_project_type TEXT,
  p_reason TEXT,
  p_notes TEXT
)
RETURNS UUID   -- Retorna o ID do audit log
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id    UUID;
  v_lead_name  TEXT;
  v_lead_value NUMERIC(12,2);
  v_audit_id   UUID;
  v_caller_id  UUID := auth.uid();
BEGIN
  -- Somente owner pode chamar
  IF public.current_user_role() <> 'owner' THEN
    RAISE EXCEPTION 'Permissão negada: apenas owner pode encerrar projetos';
  END IF;

  IF p_project_type = 'dev' THEN
    -- Busca dados do lead via project
    SELECT p.lead_id, l.name, l.value
    INTO v_lead_id, v_lead_name, v_lead_value
    FROM public.projects p
    JOIN public.leads l ON l.id = p.lead_id
    WHERE p.id = p_project_id AND p.deleted_at IS NULL;

    IF v_lead_id IS NULL THEN
      RAISE EXCEPTION 'Projeto dev não encontrado ou já encerrado';
    END IF;

    -- Soft-delete no project
    UPDATE public.projects
    SET deleted_at     = NOW(),
        deleted_reason = p_reason::public.delete_reason,
        deleted_notes  = p_notes,
        deleted_by     = v_caller_id
    WHERE id = p_project_id;

  ELSIF p_project_type = 'trafego' THEN
    SELECT t.lead_id, l.name, l.value
    INTO v_lead_id, v_lead_name, v_lead_value
    FROM public.traffic_onboarding t
    JOIN public.leads l ON l.id = t.lead_id
    WHERE t.id = p_project_id AND t.deleted_at IS NULL;

    IF v_lead_id IS NULL THEN
      RAISE EXCEPTION 'Projeto tráfego não encontrado ou já encerrado';
    END IF;

    UPDATE public.traffic_onboarding
    SET deleted_at     = NOW(),
        deleted_reason = p_reason::public.delete_reason,
        deleted_notes  = p_notes,
        deleted_by     = v_caller_id
    WHERE id = p_project_id;

  ELSE
    RAISE EXCEPTION 'project_type inválido: deve ser dev ou trafego';
  END IF;

  -- Grava audit log
  INSERT INTO public.project_deletions (
    project_id, project_type, lead_id, lead_name, lead_value,
    delete_type, reason, notes, deleted_by
  ) VALUES (
    p_project_id, p_project_type, v_lead_id, v_lead_name, v_lead_value,
    'soft', p_reason::public.delete_reason, p_notes, v_caller_id
  )
  RETURNING id INTO v_audit_id;

  -- Log no sistema
  INSERT INTO public.system_logs (event, payload, source)
  VALUES (
    'project_created',  -- reutiliza enum existente (event = project lifecycle)
    jsonb_build_object(
      'action', 'soft_delete',
      'project_id', p_project_id,
      'project_type', p_project_type,
      'lead_id', v_lead_id,
      'reason', p_reason,
      'audit_id', v_audit_id,
      'deleted_by', v_caller_id
    ),
    'owner_soft_delete_project'
  );

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_soft_delete_project TO authenticated;

-- ============================================================
-- FUNÇÃO: owner_hard_delete_project
-- Remove fisicamente o registro + grava audit (SEM VOLTA)
-- ============================================================

CREATE OR REPLACE FUNCTION public.owner_hard_delete_project(
  p_project_id UUID,
  p_project_type TEXT,
  p_reason TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id    UUID;
  v_lead_name  TEXT;
  v_lead_value NUMERIC(12,2);
  v_audit_id   UUID;
  v_caller_id  UUID := auth.uid();
BEGIN
  IF public.current_user_role() <> 'owner' THEN
    RAISE EXCEPTION 'Permissão negada: apenas owner pode excluir projetos permanentemente';
  END IF;

  IF p_project_type = 'dev' THEN
    SELECT p.lead_id, l.name, l.value
    INTO v_lead_id, v_lead_name, v_lead_value
    FROM public.projects p
    JOIN public.leads l ON l.id = p.lead_id
    WHERE p.id = p_project_id;

    IF v_lead_id IS NULL THEN
      RAISE EXCEPTION 'Projeto dev não encontrado';
    END IF;

    -- Grava audit ANTES do delete (ainda temos os dados)
    INSERT INTO public.project_deletions (
      project_id, project_type, lead_id, lead_name, lead_value,
      delete_type, reason, notes, deleted_by
    ) VALUES (
      p_project_id, p_project_type, v_lead_id, v_lead_name, v_lead_value,
      'hard', p_reason::public.delete_reason, p_notes, v_caller_id
    )
    RETURNING id INTO v_audit_id;

    -- Hard delete
    DELETE FROM public.projects WHERE id = p_project_id;

  ELSIF p_project_type = 'trafego' THEN
    SELECT t.lead_id, l.name, l.value
    INTO v_lead_id, v_lead_name, v_lead_value
    FROM public.traffic_onboarding t
    JOIN public.leads l ON l.id = t.lead_id
    WHERE t.id = p_project_id;

    IF v_lead_id IS NULL THEN
      RAISE EXCEPTION 'Projeto tráfego não encontrado';
    END IF;

    INSERT INTO public.project_deletions (
      project_id, project_type, lead_id, lead_name, lead_value,
      delete_type, reason, notes, deleted_by
    ) VALUES (
      p_project_id, p_project_type, v_lead_id, v_lead_name, v_lead_value,
      'hard', p_reason::public.delete_reason, p_notes, v_caller_id
    )
    RETURNING id INTO v_audit_id;

    DELETE FROM public.traffic_onboarding WHERE id = p_project_id;

  ELSE
    RAISE EXCEPTION 'project_type inválido: deve ser dev ou trafego';
  END IF;

  -- Log no sistema
  INSERT INTO public.system_logs (event, payload, source)
  VALUES (
    'project_created',
    jsonb_build_object(
      'action', 'hard_delete',
      'project_id', p_project_id,
      'project_type', p_project_type,
      'lead_id', v_lead_id,
      'reason', p_reason,
      'audit_id', v_audit_id,
      'deleted_by', v_caller_id
    ),
    'owner_hard_delete_project'
  );

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_hard_delete_project TO authenticated;

-- ============================================================
-- ATUALIZA RLS: projects — filtra soft-deletes para dev/trafego/vendas
-- ============================================================

-- Remove a policy de dev e recria filtrando deletados
DROP POLICY IF EXISTS "projects: dev full access" ON public.projects;

CREATE POLICY "projects: dev active only"
  ON public.projects
  FOR SELECT
  USING (
    public.current_user_role() = 'dev'
    AND deleted_at IS NULL
  );

-- Dev ainda pode UPDATE (para marcar is_delivered, etc.)
CREATE POLICY "projects: dev update active"
  ON public.projects
  FOR UPDATE
  USING (
    public.current_user_role() = 'dev'
    AND deleted_at IS NULL
  );

-- Owner vê tudo (incluindo soft-deletados, para auditoria)
-- Policy já existe: "projects: owner full access"

-- Recria vendas policy para filtrar deletados
DROP POLICY IF EXISTS "projects: vendas read own" ON public.projects;

CREATE POLICY "projects: vendas read own active"
  ON public.projects
  FOR SELECT
  USING (
    public.current_user_role() = 'vendas'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.assigned_to = auth.uid()
    )
  );

CREATE POLICY "projects: vendas update own active"
  ON public.projects
  FOR UPDATE
  USING (
    public.current_user_role() = 'vendas'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.assigned_to = auth.uid()
    )
  );

-- Tráfego: filtra deletados
DROP POLICY IF EXISTS "projects: trafego read only" ON public.projects;

CREATE POLICY "projects: trafego read active"
  ON public.projects
  FOR SELECT
  USING (
    public.current_user_role() = 'trafego'
    AND deleted_at IS NULL
  );

-- ============================================================
-- FIM DA MIGRATION 008
-- ============================================================
