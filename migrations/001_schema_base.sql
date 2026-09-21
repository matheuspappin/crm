-- ============================================================
-- MIGRATION 001 — Schema Base
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- Habilita extensão UUID (já disponível no Supabase por padrão)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TIPOS ENUM
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'vendas',
  'trafego',
  'dev',
  'owner'
);

CREATE TYPE public.lead_status AS ENUM (
  'novo',
  'reuniao',
  'proposta',
  'negociacao',
  'fechado',
  'perdido'
);

CREATE TYPE public.interaction_type AS ENUM (
  'whatsapp',
  'call',
  'email',
  'note',
  'meeting'
);

CREATE TYPE public.pixel_status AS ENUM (
  'ok',
  'warning',
  'error',
  'unknown'
);

CREATE TYPE public.log_event AS ENUM (
  'webhook_received',
  'webhook_error',
  'lead_created',
  'lead_updated',
  'project_created',
  'pixel_check',
  'cron_sla_check',
  'cron_mv_refresh'
);

-- ============================================================
-- TABELA: users
-- Espelha auth.users do Supabase, armazena role e nome público
-- ============================================================

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        public.user_role NOT NULL DEFAULT 'vendas',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Perfis dos usuários do sistema, sincronizados com auth.users';
COMMENT ON COLUMN public.users.role IS 'Role RBAC: vendas | trafego | dev | owner';

-- ============================================================
-- TABELA: leads
-- Core do CRM — cada lead representa um potencial cliente
-- ============================================================

CREATE TABLE public.leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  contact         TEXT,                           -- Telefone ou email de contato
  status          public.lead_status NOT NULL DEFAULT 'novo',
  value           NUMERIC(12, 2) DEFAULT 0,       -- Valor estimado do contrato (R$)
  -- Atribuição de tráfego (UTMs capturadas na entrada)
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  -- Gestão interna
  assigned_to     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sla_alerted     BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = badge vermelho (> 48h parado)
  last_moved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Atualizado ao mudar de status
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status       ON public.leads(status);
CREATE INDEX idx_leads_assigned_to  ON public.leads(assigned_to);
CREATE INDEX idx_leads_utm_campaign ON public.leads(utm_campaign);
CREATE INDEX idx_leads_created_at   ON public.leads(created_at DESC);

COMMENT ON TABLE public.leads IS 'Leads captados via webhook, formulário ou inserção manual';
COMMENT ON COLUMN public.leads.sla_alerted IS 'Flag setada pelo pg_cron quando lead fica > 48h sem mover';
COMMENT ON COLUMN public.leads.last_moved_at IS 'Timestamp da última mudança de status — base do cálculo SLA';

-- ============================================================
-- TABELA: interactions
-- Histórico de interações de cada lead (WhatsApp, Call, etc.)
-- ============================================================

CREATE TABLE public.interactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id          UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type             public.interaction_type NOT NULL DEFAULT 'note',
  notes            TEXT,
  next_action_date TIMESTAMPTZ,                   -- Lembrete/tarefa futura
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_lead_id    ON public.interactions(lead_id);
CREATE INDEX idx_interactions_created_at ON public.interactions(created_at DESC);

COMMENT ON TABLE public.interactions IS 'Timeline de interações: WhatsApp, calls, reuniões, notas internas';

-- ============================================================
-- TABELA: projects
-- Criada automaticamente via trigger quando lead vai para "fechado"
-- ============================================================

CREATE TABLE public.projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  figma_url       TEXT,
  prod_url        TEXT,                           -- Link Vercel ou domínio final
  pixel_status    public.pixel_status NOT NULL DEFAULT 'unknown',
  pixel_last_check TIMESTAMPTZ,
  is_delivered    BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_dev    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_lead_id      ON public.projects(lead_id);
CREATE INDEX idx_projects_is_delivered ON public.projects(is_delivered);
CREATE INDEX idx_projects_pixel_status ON public.projects(pixel_status);

COMMENT ON TABLE public.projects IS 'Workspace de entrega técnica — criado automaticamente ao fechar um lead';
COMMENT ON COLUMN public.projects.pixel_status IS 'Status do pixel monitorado: ok | warning | error | unknown';

-- ============================================================
-- TABELA: system_logs
-- Telemetria de webhooks, cron jobs e erros de API
-- ============================================================

CREATE TABLE public.system_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       public.log_event NOT NULL,
  payload     JSONB,                              -- Payload completo do evento
  status_code INTEGER,                            -- HTTP status (se aplicável)
  error_msg   TEXT,                               -- Mensagem de erro (se aplicável)
  source      TEXT,                               -- Ex: 'meta_webhook', 'cron_sla'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_event      ON public.system_logs(event);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_status     ON public.system_logs(status_code);

COMMENT ON TABLE public.system_logs IS 'Telemetria: logs de webhooks, erros de API, execuções de cron jobs';

-- ============================================================
-- FIM DA MIGRATION 001
-- ============================================================
