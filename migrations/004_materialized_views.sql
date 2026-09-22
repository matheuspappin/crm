-- ============================================================
-- MIGRATION 004 — Materialized Views (God Mode)
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- ATENÇÃO: Execute APÓS a 003_triggers.sql
-- Estas views são consumidas exclusivamente pelo Painel Executivo
-- para carregamento sub-milissegundo sem loops pesados no frontend.
-- ============================================================

-- ============================================================
-- VIEW MATERIALIZADA: MRR Atual
-- Soma mensal de leads fechados com valor recorrente (retainers)
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_mrr AS
SELECT
  DATE_TRUNC('month', updated_at)::DATE AS month,
  COUNT(*)                               AS total_deals,
  SUM(value)                             AS total_revenue,
  AVG(value)                             AS avg_deal_value
FROM public.leads
WHERE status = 'fechado'
  AND value > 0
GROUP BY DATE_TRUNC('month', updated_at)
ORDER BY month DESC
WITH DATA;

CREATE UNIQUE INDEX idx_mv_mrr_month ON public.mv_mrr(month);

COMMENT ON MATERIALIZED VIEW public.mv_mrr IS
  'MRR consolidado por mês — atualizado pelo pg_cron a cada hora';

-- ============================================================
-- VIEW MATERIALIZADA: CAC por Campanha
-- Custo de Aquisição de Cliente — cruzamento UTM x valor de contrato
-- (gasto_campanha / leads_fechados_campanha)
-- Nota: o "gasto" é injetado manualmente via tabela auxiliar ad_spend
-- ============================================================

-- Tabela auxiliar para injeção de gasto de campanhas (via API Meta/Google)
CREATE TABLE IF NOT EXISTS public.ad_spend (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign    TEXT NOT NULL,
  utm_source  TEXT NOT NULL,
  spend_date  DATE NOT NULL,
  spend_usd   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  spend_brl   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign, utm_source, spend_date)
);

ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_spend: trafego full access"
  ON public.ad_spend FOR ALL
  USING (public.current_user_role() IN ('trafego', 'owner'));

CREATE POLICY "ad_spend: others read only"
  ON public.ad_spend FOR SELECT
  USING (public.current_user_role() IN ('vendas', 'dev'));

CREATE MATERIALIZED VIEW public.mv_cac AS
SELECT
  l.utm_campaign                                   AS campaign,
  l.utm_source                                     AS source,
  COUNT(l.id)                                      AS total_leads,
  COUNT(l.id) FILTER (WHERE l.status = 'fechado') AS closed_leads,
  SUM(l.value) FILTER (WHERE l.status = 'fechado') AS total_revenue,
  COALESCE(SUM(a.spend_brl), 0)                   AS total_spend,
  -- CPL: Custo por Lead
  CASE
    WHEN COUNT(l.id) > 0
    THEN COALESCE(SUM(a.spend_brl), 0) / COUNT(l.id)
    ELSE 0
  END AS cpl,
  -- CAC: Custo de Aquisição de Cliente
  CASE
    WHEN COUNT(l.id) FILTER (WHERE l.status = 'fechado') > 0
    THEN COALESCE(SUM(a.spend_brl), 0) / COUNT(l.id) FILTER (WHERE l.status = 'fechado')
    ELSE 0
  END AS cac,
  -- ROI: Retorno sobre Investimento
  CASE
    WHEN COALESCE(SUM(a.spend_brl), 0) > 0
    THEN (SUM(l.value) FILTER (WHERE l.status = 'fechado') / SUM(a.spend_brl)) * 100
    ELSE 0
  END AS roi_percent
FROM public.leads l
LEFT JOIN public.ad_spend a
  ON a.campaign = l.utm_campaign
  AND a.utm_source = l.utm_source
WHERE l.utm_campaign IS NOT NULL
GROUP BY l.utm_campaign, l.utm_source
WITH DATA;

CREATE UNIQUE INDEX idx_mv_cac_campaign ON public.mv_cac(campaign, source);

COMMENT ON MATERIALIZED VIEW public.mv_cac IS
  'CAC, CPL e ROI por campanha/fonte — cruzamento UTMs x gasto x receita';

-- ============================================================
-- VIEW MATERIALIZADA: Pipeline Velocity
-- Tempo médio em dias desde a criação até o fechamento
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_pipeline_velocity AS
SELECT
  DATE_TRUNC('month', l.updated_at)::DATE AS month,
  AVG(
    EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400
  )::NUMERIC(10, 2)                        AS avg_days_to_close,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400
  )::NUMERIC(10, 2)                        AS median_days_to_close,
  MIN(
    EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400
  )::NUMERIC(10, 2)                        AS min_days,
  MAX(
    EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400
  )::NUMERIC(10, 2)                        AS max_days,
  COUNT(*)                                 AS deals_closed
FROM public.leads l
WHERE l.status = 'fechado'
GROUP BY DATE_TRUNC('month', l.updated_at)
ORDER BY month DESC
WITH DATA;

CREATE UNIQUE INDEX idx_mv_velocity_month ON public.mv_pipeline_velocity(month);

COMMENT ON MATERIALIZED VIEW public.mv_pipeline_velocity IS
  'Velocidade do pipeline: tempo médio e mediano de fechamento por mês';

-- ============================================================
-- VIEW MATERIALIZADA: Win Rate & Funil
-- Taxa de conversão global e por etapa do funil
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_win_rate AS
SELECT
  DATE_TRUNC('month', created_at)::DATE               AS month,
  COUNT(*)                                             AS total_leads,
  COUNT(*) FILTER (WHERE status = 'fechado')          AS total_won,
  COUNT(*) FILTER (WHERE status = 'perdido')          AS total_lost,
  COUNT(*) FILTER (WHERE status = 'novo')             AS in_novo,
  COUNT(*) FILTER (WHERE status = 'reuniao')          AS in_reuniao,
  COUNT(*) FILTER (WHERE status = 'proposta')         AS in_proposta,
  COUNT(*) FILTER (WHERE status = 'negociacao')       AS in_negociacao,
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE status = 'fechado')::NUMERIC / COUNT(*) * 100,
      2
    )
    ELSE 0
  END                                                  AS win_rate_percent,
  COALESCE(SUM(value) FILTER (WHERE status = 'fechado'), 0) AS revenue_won,
  COALESCE(SUM(value) FILTER (WHERE status = 'perdido'), 0) AS revenue_lost
FROM public.leads
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC
WITH DATA;

CREATE UNIQUE INDEX idx_mv_win_rate_month ON public.mv_win_rate(month);

COMMENT ON MATERIALIZED VIEW public.mv_win_rate IS
  'Win rate, funil e receita por mês — base dos KPIs do God Mode';

-- ============================================================
-- VIEW: Dashboard Executivo (combinação das MVs — consulta leve)
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
  -- Projetos em andamento
  (
    SELECT COUNT(*) FROM public.projects WHERE is_delivered = FALSE
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
-- FIM DA MIGRATION 004
-- ============================================================
