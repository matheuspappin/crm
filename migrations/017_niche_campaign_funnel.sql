-- ============================================================
-- MIGRATION 017 — Niche Campaigns & Funnel Intelligence
-- CRM God Mode | Rastreabilidade de Nichos, Disparos e Conversão
-- ============================================================

-- 1. Tabela de Campanhas Outbound por Nicho
CREATE TABLE IF NOT EXISTS public.outbound_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    niche TEXT NOT NULL, -- Ex: 'psicologia', 'estetica', 'odontologia', 'advocacia'
    city TEXT,
    channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'call', 'email', 'instagram'
    target_script TEXT,                      -- Copy/roteiro utilizado
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    total_dispatches INTEGER NOT NULL DEFAULT 0,
    total_replies INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_niche ON public.outbound_campaigns(niche);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.outbound_campaigns(status);

COMMENT ON TABLE public.outbound_campaigns IS 'Campanhas de disparo outbound segmentadas por nicho e copy';

-- 2. Tabela de Disparos Individuais
CREATE TABLE IF NOT EXISTS public.outbound_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
    scraped_lead_id UUID REFERENCES public.scraped_leads(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    company_name TEXT,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    replied BOOLEAN NOT NULL DEFAULT FALSE,
    replied_at TIMESTAMPTZ,
    reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'objection', 'opt_out')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatches_campaign ON public.outbound_dispatches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_scraped_lead ON public.outbound_dispatches(scraped_lead_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_replied ON public.outbound_dispatches(replied);

COMMENT ON TABLE public.outbound_dispatches IS 'Registro de cada mensagem disparada e status de resposta';

-- 3. Enriquecer a tabela core public.leads
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS niche TEXT NOT NULL DEFAULT 'geral',
    ADD COLUMN IF NOT EXISTS scraped_lead_id UUID REFERENCES public.scraped_leads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.outbound_campaigns(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS loss_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reply_sentiment TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_niche ON public.leads(niche);
CREATE INDEX IF NOT EXISTS idx_leads_niche_status ON public.leads(niche, status);

-- 4. Função e Trigger para incrementar contadores da campanha
CREATE OR REPLACE FUNCTION public.handle_dispatch_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.outbound_campaigns
        SET total_dispatches = total_dispatches + 1,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.replied = FALSE AND NEW.replied = TRUE THEN
            UPDATE public.outbound_campaigns
            SET total_replies = total_replies + 1,
                updated_at = NOW()
            WHERE id = NEW.campaign_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispatch_counters ON public.outbound_dispatches;
CREATE TRIGGER trg_dispatch_counters
    AFTER INSERT OR UPDATE ON public.outbound_dispatches
    FOR EACH ROW EXECUTE FUNCTION public.handle_dispatch_counters();

-- 5. View Analítica: Funil Completo por Nicho
CREATE OR REPLACE VIEW public.vw_niche_funnel_analytics AS
WITH dispatches_agg AS (
    SELECT
        c.niche,
        COUNT(d.id) AS total_dispatched,
        COUNT(d.id) FILTER (WHERE d.replied = TRUE) AS total_replied,
        COUNT(d.id) FILTER (WHERE d.reply_sentiment = 'positive') AS total_positive_replies
    FROM public.outbound_campaigns c
    LEFT JOIN public.outbound_dispatches d ON d.campaign_id = c.id
    GROUP BY c.niche
),
leads_agg AS (
    SELECT
        l.niche,
        COUNT(l.id) AS total_leads_entered,
        COUNT(l.id) FILTER (WHERE l.status IN ('reuniao', 'proposta', 'negociacao', 'fechado')) AS total_meetings,
        COUNT(l.id) FILTER (WHERE l.status = 'fechado') AS total_won,
        COUNT(l.id) FILTER (WHERE l.status = 'perdido') AS total_lost,
        COALESCE(SUM(l.value) FILTER (WHERE l.status = 'fechado'), 0) AS total_won_revenue,
        COALESCE(AVG(l.value) FILTER (WHERE l.status = 'fechado'), 0) AS avg_ticket_won
    FROM public.leads l
    GROUP BY l.niche
),
all_niches AS (
    SELECT DISTINCT niche FROM (
        SELECT niche FROM public.outbound_campaigns
        UNION
        SELECT niche FROM public.leads WHERE niche IS NOT NULL AND niche <> ''
    ) n
)
SELECT
    an.niche,
    COALESCE(da.total_dispatched, 0) AS total_dispatched,
    COALESCE(da.total_replied, 0) AS total_replied,
    CASE 
        WHEN COALESCE(da.total_dispatched, 0) > 0 
        THEN ROUND((COALESCE(da.total_replied, 0)::NUMERIC / da.total_dispatched::NUMERIC) * 100, 1)
        ELSE 0
    END AS reply_rate_pct,
    COALESCE(la.total_leads_entered, 0) AS total_leads_entered,
    COALESCE(la.total_meetings, 0) AS total_meetings,
    COALESCE(la.total_won, 0) AS total_won,
    COALESCE(la.total_lost, 0) AS total_lost,
    CASE 
        WHEN COALESCE(la.total_leads_entered, 0) > 0 
        THEN ROUND((COALESCE(la.total_won, 0)::NUMERIC / la.total_leads_entered::NUMERIC) * 100, 1)
        ELSE 0
    END AS close_rate_pct,
    COALESCE(la.total_won_revenue, 0) AS total_won_revenue,
    COALESCE(ROUND(la.avg_ticket_won, 2), 0) AS avg_ticket_won
FROM all_niches an
LEFT JOIN dispatches_agg da ON da.niche = an.niche
LEFT JOIN leads_agg la ON la.niche = an.niche;

-- 6. Habilitar RLS
ALTER TABLE public.outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_dispatches ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Campaigns: Todos autenticados podem ver" ON public.outbound_campaigns;
CREATE POLICY "Campaigns: Todos autenticados podem ver"
    ON public.outbound_campaigns FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Campaigns: Vendas e Owner podem criar e editar" ON public.outbound_campaigns;
CREATE POLICY "Campaigns: Vendas e Owner podem criar e editar"
    ON public.outbound_campaigns FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'vendas'));

DROP POLICY IF EXISTS "Dispatches: Todos autenticados podem ver" ON public.outbound_dispatches;
CREATE POLICY "Dispatches: Todos autenticados podem ver"
    ON public.outbound_dispatches FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Dispatches: Vendas e Owner podem criar e editar" ON public.outbound_dispatches;
CREATE POLICY "Dispatches: Vendas e Owner podem criar e editar"
    ON public.outbound_dispatches FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'vendas'));
