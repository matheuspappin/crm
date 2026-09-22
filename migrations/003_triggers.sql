-- ============================================================
-- MIGRATION 003 — Triggers & Functions
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- ATENÇÃO: Execute APÓS a 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- FUNÇÃO: Atualiza updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplica o trigger em todas as tabelas com updated_at
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNÇÃO: Reseta last_moved_at e sla_alerted ao mudar de status
-- Mantém o rastreamento do SLA preciso
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_moved_at = NOW();
    NEW.sla_alerted = FALSE; -- Reseta o alerta ao mover de etapa
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_status_change
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_lead_status_change();

-- ============================================================
-- FUNÇÃO: Cria project automaticamente quando lead vai para "fechado"
-- Este é o trigger que conecta o Painel Comercial ao Painel do Dev
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_lead_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissões elevadas para contornar RLS na inserção
AS $$
BEGIN
  -- Só age quando o status muda PARA 'fechado'
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    -- Insere project (ignora se já existir — proteção contra duplo trigger)
    INSERT INTO public.projects (lead_id)
    VALUES (NEW.id)
    ON CONFLICT (lead_id) DO NOTHING;

    -- Log do evento
    INSERT INTO public.system_logs (event, payload, source)
    VALUES (
      'project_created',
      jsonb_build_object(
        'lead_id', NEW.id,
        'lead_name', NEW.name,
        'lead_value', NEW.value
      ),
      'trigger:handle_lead_closed'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_closed
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_lead_closed();

-- ============================================================
-- FUNÇÃO: Sincroniza perfil na tabela users ao criar auth user
-- Disparada pelo Supabase Auth via hook de usuário novo
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'vendas'
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Hook do Supabase Auth: cria perfil automaticamente no cadastro
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- FUNÇÃO: Utilitária para inserir logs (usada pela API Next.js)
-- Facilita inserção de logs sem RLS bloqueando o anon client
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_system_log(
  p_event     TEXT,
  p_payload   JSONB DEFAULT NULL,
  p_status    INTEGER DEFAULT NULL,
  p_error_msg TEXT DEFAULT NULL,
  p_source    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.system_logs (event, payload, status_code, error_msg, source)
  VALUES (
    p_event::public.log_event,
    p_payload,
    p_status,
    p_error_msg,
    p_source
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Concede execução da função ao role anon (usada pelo webhook via service_role na prática)
GRANT EXECUTE ON FUNCTION public.insert_system_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_system_log TO service_role;

-- ============================================================
-- FIM DA MIGRATION 003
-- ============================================================
