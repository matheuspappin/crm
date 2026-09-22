-- ============================================================
-- MIGRATION 005 — pg_cron Jobs
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- PRÉ-REQUISITO: Habilitar a extensão pg_cron no Supabase Dashboard
-- Caminho: Database → Extensions → pg_cron → Enable
-- ============================================================
-- ATENÇÃO: Execute APÓS a 004_materialized_views.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Garante que o schema cron seja acessível
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================
-- JOB 1: SLA Check — a cada 30 minutos
-- Marca leads parados na mesma etapa há mais de 48 horas
-- ============================================================

SELECT cron.schedule(
  'crm-sla-check',           -- Nome único do job
  '*/30 * * * *',            -- Cron expression: a cada 30 min
  $$
    UPDATE public.leads
    SET sla_alerted = TRUE
    WHERE
      status NOT IN ('fechado', 'perdido')
      AND sla_alerted = FALSE
      AND last_moved_at < NOW() - INTERVAL '48 hours';

    -- Registra execução no log
    INSERT INTO public.system_logs (event, payload, source)
    VALUES (
      'cron_sla_check',
      jsonb_build_object(
        'checked_at', NOW(),
        'alerted_count', (
          SELECT COUNT(*) FROM public.leads
          WHERE sla_alerted = TRUE
            AND last_moved_at < NOW() - INTERVAL '48 hours'
        )
      ),
      'pg_cron:crm-sla-check'
    );
  $$
);

-- ============================================================
-- JOB 2: Refresh Materialized Views — a cada hora
-- Atualiza MVs do God Mode de forma concorrente (sem lock de leitura)
-- ============================================================

SELECT cron.schedule(
  'crm-refresh-materialized-views',
  '0 * * * *',               -- Cron expression: no minuto 0 de cada hora
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_mrr;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cac;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_pipeline_velocity;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_win_rate;

    INSERT INTO public.system_logs (event, payload, source)
    VALUES (
      'cron_mv_refresh',
      jsonb_build_object('refreshed_at', NOW()),
      'pg_cron:crm-refresh-materialized-views'
    );
  $$
);

-- ============================================================
-- JOB 3: Pixel Health Check — a cada 15 minutos
-- Verifica se os pixels dos projetos estão respondendo
-- Usa pg_net para disparar HTTP requests (extensão do Supabase)
-- ============================================================

-- Nota: pg_net deve estar habilitado em Database → Extensions → pg_net
-- Se não estiver disponível, esta verificação pode ser feita via
-- um Worker Node.js externo que consome a tabela projects.

CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'crm-pixel-health-check',
  '*/15 * * * *',            -- Cron expression: a cada 15 min
  $$
    -- Para cada projeto com URL de produção e não entregue, dispara ping
    -- O resultado é processado por um webhook que atualiza pixel_status
    WITH projects_to_check AS (
      SELECT id, prod_url
      FROM public.projects
      WHERE prod_url IS NOT NULL
        AND is_delivered = FALSE
      LIMIT 20  -- Processa em lotes para não sobrecarregar
    )
    SELECT
      net.http_get(
        url := 'https://' || 
               current_setting('app.pixel_check_worker_url', true) || 
               '/check?project_id=' || p.id::TEXT ||
               '&url=' || p.prod_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.worker_secret', true)
        )
      )
    FROM projects_to_check p;

    INSERT INTO public.system_logs (event, payload, source)
    VALUES (
      'pixel_check',
      jsonb_build_object('triggered_at', NOW()),
      'pg_cron:crm-pixel-health-check'
    );
  $$
);

-- ============================================================
-- CONFIGURAÇÃO: Parâmetros de runtime do app
-- Defina estes valores via Supabase Dashboard → Settings → Config
-- ou via `ALTER DATABASE ... SET app.xxx = 'value'`
-- ============================================================

-- Exemplo de configuração (substitua pelos valores reais):
-- ALTER DATABASE postgres SET app.pixel_check_worker_url = 'seu-worker.vercel.app/api';
-- ALTER DATABASE postgres SET app.worker_secret = 'seu-secret-aqui';

-- ============================================================
-- CONSULTA DE VERIFICAÇÃO: Lista todos os jobs registrados
-- ============================================================

-- Para verificar os jobs criados, execute no SQL Editor:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ============================================================
-- FIM DA MIGRATION 005
-- ============================================================
