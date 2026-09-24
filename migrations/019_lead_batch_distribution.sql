-- ============================================================
-- MIGRATION 019 — Lead Batch Distribution & Freshness Tracking
-- CRM God Mode | Distribuição por Lotes e Timing de Geração
-- ============================================================

-- 1. Enriquecer scraped_leads com dados de distribuição
ALTER TABLE public.scraped_leads
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS distribution_status TEXT NOT NULL DEFAULT 'disponivel' 
        CHECK (distribution_status IN ('disponivel', 'distribuido', 'em_campanha', 'descartado'));

CREATE INDEX IF NOT EXISTS idx_scraped_leads_search_status 
    ON public.scraped_leads(search_id, distribution_status);

CREATE INDEX IF NOT EXISTS idx_scraped_leads_assigned 
    ON public.scraped_leads(assigned_to);

-- 2. Enriquecer public.leads com data original de geração pelo robô/aquecedor
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS generation_created_at TIMESTAMPTZ;

-- Preencher generation_created_at retroativamente com a data de criação atual
UPDATE public.leads 
SET generation_created_at = created_at 
WHERE generation_created_at IS NULL;

-- 3. Atualizar Políticas de RLS para scraped_leads
DROP POLICY IF EXISTS "vendas own scraped_leads" ON public.scraped_leads;
CREATE POLICY "vendas own scraped_leads" ON public.scraped_leads
    FOR SELECT USING (
        auth.uid() = user_id 
        OR auth.uid() = assigned_to
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
    );

DROP POLICY IF EXISTS "owner all scraped_leads" ON public.scraped_leads;
CREATE POLICY "owner all scraped_leads" ON public.scraped_leads
    FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );

-- 4. Atualizar Políticas de RLS para scraped_searches
DROP POLICY IF EXISTS "vendas own scraped_searches" ON public.scraped_searches;
CREATE POLICY "vendas own scraped_searches" ON public.scraped_searches
    FOR SELECT USING (
        auth.uid() = user_id 
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
        OR EXISTS (
            SELECT 1 FROM public.scraped_leads sl 
            WHERE sl.search_id = public.scraped_searches.id 
            AND sl.assigned_to = auth.uid()
        )
    );

DROP POLICY IF EXISTS "owner all scraped_searches" ON public.scraped_searches;
CREATE POLICY "owner all scraped_searches" ON public.scraped_searches
    FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );
