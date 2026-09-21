-- ============================================================
-- MIGRATION 002 — Row Level Security (RLS)
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- ATENÇÃO: Execute APÓS a 001_schema_base.sql
-- ============================================================

-- Função helper: retorna a role do usuário atual (evita subconsultas repetidas)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- RLS: TABELA users
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado vê o próprio perfil
CREATE POLICY "users: select own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Owner vê todos os perfis
CREATE POLICY "users: owner sees all"
  ON public.users
  FOR SELECT
  USING (public.current_user_role() = 'owner');

-- Qualquer usuário atualiza o próprio perfil
CREATE POLICY "users: update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Owner pode inserir/deletar usuários
CREATE POLICY "users: owner full access"
  ON public.users
  FOR ALL
  USING (public.current_user_role() = 'owner');

-- ============================================================
-- RLS: TABELA leads
-- ============================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- vendas: vê e manipula todos os leads (CRM é o domínio deles)
CREATE POLICY "leads: vendas full access"
  ON public.leads
  FOR ALL
  USING (public.current_user_role() = 'vendas');

-- trafego: somente leitura (precisa ver status e UTMs para cruzar com gastos)
CREATE POLICY "leads: trafego read only"
  ON public.leads
  FOR SELECT
  USING (public.current_user_role() = 'trafego');

-- dev: vê somente leads fechados (são os projetos dele)
CREATE POLICY "leads: dev sees closed"
  ON public.leads
  FOR SELECT
  USING (
    public.current_user_role() = 'dev'
    AND status = 'fechado'
  );

-- owner: acesso total
CREATE POLICY "leads: owner full access"
  ON public.leads
  FOR ALL
  USING (public.current_user_role() = 'owner');

-- Service role (cron jobs, webhooks): acesso total via service_role key
-- (service_role bypassa RLS por padrão, não precisa de policy)

-- ============================================================
-- RLS: TABELA interactions
-- ============================================================

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- vendas: CRUD em todas as interações
CREATE POLICY "interactions: vendas full access"
  ON public.interactions
  FOR ALL
  USING (public.current_user_role() = 'vendas');

-- trafego: somente leitura (contexto das interações)
CREATE POLICY "interactions: trafego read only"
  ON public.interactions
  FOR SELECT
  USING (public.current_user_role() = 'trafego');

-- dev: somente leitura (contexto do cliente)
CREATE POLICY "interactions: dev read only"
  ON public.interactions
  FOR SELECT
  USING (public.current_user_role() = 'dev');

-- owner: acesso total
CREATE POLICY "interactions: owner full access"
  ON public.interactions
  FOR ALL
  USING (public.current_user_role() = 'owner');

-- ============================================================
-- RLS: TABELA projects
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- dev: CRUD total em projetos (é o domínio deles)
CREATE POLICY "projects: dev full access"
  ON public.projects
  FOR ALL
  USING (public.current_user_role() = 'dev');

-- vendas: vê projetos dos próprios leads (status de entrega)
CREATE POLICY "projects: vendas read own"
  ON public.projects
  FOR SELECT
  USING (
    public.current_user_role() = 'vendas'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.assigned_to = auth.uid()
    )
  );

-- trafego: somente leitura
CREATE POLICY "projects: trafego read only"
  ON public.projects
  FOR SELECT
  USING (public.current_user_role() = 'trafego');

-- owner: acesso total
CREATE POLICY "projects: owner full access"
  ON public.projects
  FOR ALL
  USING (public.current_user_role() = 'owner');

-- ============================================================
-- RLS: TABELA system_logs
-- ============================================================

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- dev: leitura de todos os logs (monitoria técnica)
CREATE POLICY "system_logs: dev read only"
  ON public.system_logs
  FOR SELECT
  USING (public.current_user_role() = 'dev');

-- owner: acesso total
CREATE POLICY "system_logs: owner full access"
  ON public.system_logs
  FOR ALL
  USING (public.current_user_role() = 'owner');

-- ============================================================
-- REALTIME: Habilita publicações para WebSocket
-- ============================================================

-- Adiciona tabelas ao canal de publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- ============================================================
-- FIM DA MIGRATION 002
-- ============================================================
