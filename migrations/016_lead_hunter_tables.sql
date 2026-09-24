-- ============================================================
-- MIGRATION 016 — Lead Hunter Integration
-- ============================================================

-- 1. Tabela para o histórico de buscas do Lead Hunter
CREATE TABLE IF NOT EXISTS public.scraped_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    city TEXT NOT NULL,
    source TEXT DEFAULT 'desktop',
    total_leads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela para armazenar os leads brutos/frios raspados do mapa
CREATE TABLE IF NOT EXISTS public.scraped_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID REFERENCES public.scraped_searches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id TEXT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    website TEXT,
    rating NUMERIC,
    user_ratings INTEGER,
    maps_url TEXT,
    has_website BOOLEAN,
    has_phone BOOLEAN,
    score INTEGER DEFAULT 0,
    score_reasons JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Segurança)
ALTER TABLE public.scraped_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_leads ENABLE ROW LEVEL SECURITY;

-- Políticas para Vendedores verem apenas as próprias buscas/leads raspados
DROP POLICY IF EXISTS "vendas own scraped_searches" ON public.scraped_searches;
CREATE POLICY "vendas own scraped_searches" ON public.scraped_searches
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vendas own scraped_leads" ON public.scraped_leads;
CREATE POLICY "vendas own scraped_leads" ON public.scraped_leads
    FOR ALL USING (auth.uid() = user_id);

-- Owner vê tudo
DROP POLICY IF EXISTS "owner all scraped_searches" ON public.scraped_searches;
CREATE POLICY "owner all scraped_searches" ON public.scraped_searches
    FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );

DROP POLICY IF EXISTS "owner all scraped_leads" ON public.scraped_leads;
CREATE POLICY "owner all scraped_leads" ON public.scraped_leads
    FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );
