-- ============================================================
-- MIGRATION 023 — Separação Lead Hunter vs Aquecedor de Leads
-- Garante que pacotes do aquecedor (source='aquecedor_leads')
-- NÃO aparecem no Lead Hunter (desktop) nem no Kanban de vendas.
-- Só o Super Admin (owner) vê pacotes do aquecedor no Gestor de Lotes.
-- ============================================================

-- 1. CORRIGIR O CHECK CONSTRAINT do distribution_status
--    Adiciona 'respondeu_maquina' sem perder dados existentes
ALTER TABLE public.scraped_leads
    DROP CONSTRAINT IF EXISTS scraped_leads_distribution_status_check;

ALTER TABLE public.scraped_leads
    ADD CONSTRAINT scraped_leads_distribution_status_check
    CHECK (distribution_status IN (
        'disponivel',
        'distribuido',
        'em_campanha',
        'descartado',
        'respondeu_maquina'
    ));

-- 2. ADICIONAR COLUNA lead_source NA scraped_leads (para filtrar por origem)
--    Herda o source da scraped_searches para facilitar queries diretas
ALTER TABLE public.scraped_leads
    ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'desktop';

-- Preencher retroativamente pelo source da scraped_search pai
UPDATE public.scraped_leads sl
SET lead_source = ss.source
FROM public.scraped_searches ss
WHERE sl.search_id = ss.id
  AND sl.lead_source = 'desktop'
  AND ss.source IS NOT NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scraped_leads_source
    ON public.scraped_leads(lead_source);

CREATE INDEX IF NOT EXISTS idx_scraped_searches_source
    ON public.scraped_searches(source);

-- 3. ATUALIZAR RLS DE scraped_searches
--    Vendedores SÓ veem buscas com source = 'desktop' (Lead Hunter)
--    Pacotes do aquecedor (source = 'aquecedor_leads') só visíveis ao owner

DROP POLICY IF EXISTS "vendas own scraped_searches" ON public.scraped_searches;
CREATE POLICY "vendas own scraped_searches" ON public.scraped_searches
    FOR SELECT USING (
        -- Vendedor vê apenas suas próprias buscas do Lead Hunter (desktop)
        (
            auth.uid() = user_id
            AND (source IS NULL OR source = 'desktop')
        )
        OR
        -- Vendedor pode ver buscas onde tem leads distribuídos a ele,
        -- MAS apenas de source='desktop' (não aquecedor)
        (
            (source IS NULL OR source = 'desktop')
            AND EXISTS (
                SELECT 1 FROM public.scraped_leads sl
                WHERE sl.search_id = public.scraped_searches.id
                AND sl.assigned_to = auth.uid()
            )
        )
    );

-- Owner vê absolutamente tudo (Lead Hunter + Aquecedor)
DROP POLICY IF EXISTS "owner all scraped_searches" ON public.scraped_searches;
CREATE POLICY "owner all scraped_searches" ON public.scraped_searches
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
    );

-- INSERT/UPDATE/DELETE: apenas owner e o próprio dono do registro
DROP POLICY IF EXISTS "scraped_searches write policy" ON public.scraped_searches;
CREATE POLICY "scraped_searches write policy" ON public.scraped_searches
    FOR ALL USING (
        auth.uid() = user_id
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
    );

-- 4. ATUALIZAR RLS DE scraped_leads
--    Vendedores veem apenas leads do Lead Hunter atribuídos a eles
--    Leads do aquecedor (lead_source='aquecedor_leads') só ao owner

DROP POLICY IF EXISTS "vendas own scraped_leads" ON public.scraped_leads;
CREATE POLICY "vendas own scraped_leads" ON public.scraped_leads
    FOR SELECT USING (
        -- Vendedor vê apenas leads do desktop (Lead Hunter) que sejam seus
        (
            (lead_source IS NULL OR lead_source = 'desktop')
            AND (auth.uid() = user_id OR auth.uid() = assigned_to)
        )
    );

-- Owner vê tudo
DROP POLICY IF EXISTS "owner all scraped_leads" ON public.scraped_leads;
CREATE POLICY "owner all scraped_leads" ON public.scraped_leads
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
    );

-- INSERT/UPDATE/DELETE pelo dono ou owner
DROP POLICY IF EXISTS "scraped_leads write policy" ON public.scraped_leads;
CREATE POLICY "scraped_leads write policy" ON public.scraped_leads
    FOR ALL USING (
        auth.uid() = user_id
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
    );

-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.scraped_searches.source IS
    'Origem da busca: ''desktop'' = Lead Hunter manual | ''aquecedor_leads'' = Aquecedor automático. Só o owner vê pacotes do aquecedor.';

COMMENT ON COLUMN public.scraped_leads.lead_source IS
    'Origem do lead: ''desktop'' = Lead Hunter | ''aquecedor_leads'' = Aquecedor. Usado para isolamento por RLS.';
