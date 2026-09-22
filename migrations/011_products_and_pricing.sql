-- ============================================================
-- MIGRATION 011 — Produtos e Preços (Super Admin)
-- CRM God Mode | Ofertas Isca, MRR e SaaS
-- ============================================================

-- ============================================================
-- TIPOS ENUM
-- ============================================================

CREATE TYPE public.product_category AS ENUM (
  'tripwire', -- Oferta Isca (Baixo valor, alto volume)
  'saas',     -- Assinatura Recorrente (Mensalidade)
  'service',  -- Serviço Pontual (Consultoria, Setup Alto)
  'hardware'  -- Totens, Equipamentos
);

CREATE TYPE public.subscription_status AS ENUM (
  'active',
  'canceled',
  'trial',
  'paused'
);

-- ============================================================
-- TABELA: products
-- Catálogo de serviços da agência
-- ============================================================

CREATE TABLE public.products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  category    public.product_category NOT NULL DEFAULT 'service',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.products IS 'Catálogo de serviços e produtos (Tripwires, SaaS, etc)';

-- ============================================================
-- TABELA: pricing_plans
-- Preços dos produtos. Permite versionar (inativar plano antigo, criar novo)
-- ============================================================

CREATE TABLE public.pricing_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL, -- Ex: "Plano Anual", "Setup Promocional"
  setup_fee       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monthly_fee     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  internal_cost   NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Custo para calcular lucro (API, servidor)
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pricing_product ON public.pricing_plans(product_id);

COMMENT ON TABLE public.pricing_plans IS 'Tabela de preços vinculada aos produtos (permite versionamento de planos)';
COMMENT ON COLUMN public.pricing_plans.internal_cost IS 'Custo mensal interno estimado para manter este serviço (usado para calcular MRR líquido e Lucro)';

-- ============================================================
-- TABELA: lead_subscriptions
-- O que foi vendido para o cliente (vinculado ao Lead/Contrato)
-- ============================================================

CREATE TABLE public.lead_subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id          UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  pricing_plan_id  UUID NOT NULL REFERENCES public.pricing_plans(id) ON DELETE RESTRICT,
  status           public.subscription_status NOT NULL DEFAULT 'active',
  custom_setup_fee NUMERIC(12, 2), -- Permite ao vendedor dar desconto/acréscimo pontual
  custom_monthly   NUMERIC(12, 2), -- Mensalidade negociada
  start_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date         TIMESTAMPTZ,    -- Caso seja cancelado
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_subs_lead ON public.lead_subscriptions(lead_id);
CREATE INDEX idx_lead_subs_plan ON public.lead_subscriptions(pricing_plan_id);

COMMENT ON TABLE public.lead_subscriptions IS 'Registra os contratos/planos anexados a um lead (MRR + Setup)';

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- Apenas OWNER altera catálogo, todos podem ler.
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_subscriptions ENABLE ROW LEVEL SECURITY;

-- Products
CREATE POLICY "Products: Todos autenticados podem ver" 
  ON public.products FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Products: Apenas OWNER pode modificar" 
  ON public.products FOR ALL 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'owner');

-- Pricing Plans
CREATE POLICY "Pricing Plans: Todos autenticados podem ver" 
  ON public.pricing_plans FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Pricing Plans: Apenas OWNER pode modificar" 
  ON public.pricing_plans FOR ALL 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'owner');

-- Lead Subscriptions
CREATE POLICY "Lead Subs: Todos autenticados podem ver" 
  ON public.lead_subscriptions FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Lead Subs: Vendedores e Owners podem inserir/modificar" 
  ON public.lead_subscriptions FOR ALL 
  TO authenticated 
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'vendas')
  );

-- Triggers for updated_at
CREATE TRIGGER trg_products_updated_at 
  BEFORE UPDATE ON public.products 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_pricing_plans_updated_at 
  BEFORE UPDATE ON public.pricing_plans 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_lead_subs_updated_at 
  BEFORE UPDATE ON public.lead_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
