-- ============================================================
-- MIGRATION 022 — Closer AKAAI: Agente IA de Fechamento
-- CRM God Mode | Registra o usuário AKAAI como vendedor
-- ============================================================
-- Execute no painel Supabase > SQL Editor
-- ============================================================

-- 1. Cria o usuário do AKAAI em auth.users
DO $$
DECLARE
  v_akaai_id UUID;
  v_instance  UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

  -- Verifica se já existe
  SELECT id INTO v_akaai_id FROM auth.users WHERE email = 'closer.akaai@agencia.com';

  IF v_akaai_id IS NULL THEN
    v_akaai_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      v_akaai_id, v_instance, 'authenticated', 'authenticated',
      'closer.akaai@agencia.com',
      crypt('AkaaI@Cl0ser!2025', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"AKAAI Closer IA","role":"vendas"}'::jsonb,
      FALSE, NOW(), NOW()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_akaai_id,
      format('{"sub":"%s","email":"closer.akaai@agencia.com"}', v_akaai_id::text)::jsonb,
      'email', 'closer.akaai@agencia.com', NOW(), NOW()
    );

    RAISE NOTICE '✅ Usuário AKAAI Closer criado: %', v_akaai_id;
  ELSE
    RAISE NOTICE 'ℹ️ AKAAI Closer já existia: %', v_akaai_id;
  END IF;

  -- 2. Garante o registro em public.users (vendedor padrão)
  INSERT INTO public.users (id, name, email, role)
  VALUES (v_akaai_id, '🤖 AKAAI Closer IA', 'closer.akaai@agencia.com', 'vendas')
  ON CONFLICT (id) DO UPDATE
    SET name = '🤖 AKAAI Closer IA', role = 'vendas', updated_at = NOW();

  RAISE NOTICE '✅ AKAAI registrado em public.users com role=vendas';

END;
$$;

-- 3. Adiciona configurações globais do Closer AKAAI na tabela system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES
  (
    'closer_akaai_ativo',
    'false'::jsonb,
    'Status do Closer AKAAI: true = processando leads automaticamente'
  ),
  (
    'closer_akaai_modelo',
    '"gemini-3.1-flash-lite"'::jsonb,
    'Modelo Gemini utilizado pelo Closer AKAAI (recomendado: flash-lite para 500 RPD grátis)'
  ),
  (
    'closer_akaai_valor_lp',
    '499'::jsonb,
    'Valor padrão da Landing Page ofertada pelo AKAAI (em reais)'
  )
ON CONFLICT (key) DO NOTHING;

-- 4. Adiciona o evento ao enum log_event (caso ainda não exista)
DO $$
BEGIN
  ALTER TYPE public.log_event ADD VALUE IF NOT EXISTS 'closer_akaai_instalado';
EXCEPTION WHEN others THEN
  NULL; -- ignora se o banco não suportar IF NOT EXISTS nessa versão
END;
$$;

-- Log do evento de instalação (executado após o commit do ALTER TYPE)
-- NOTA: Em Postgres, ADD VALUE a um enum só é visível após o commit da transação.
-- Por isso registramos usando um valor existente e deixamos a descrição no payload.
INSERT INTO public.system_logs (event, payload, source)
VALUES (
  'lead_updated',
  jsonb_build_object(
    'evento', 'closer_akaai_instalado',
    'versao', '1.0.0',
    'instalado_em', NOW()::text,
    'descricao', 'Closer AKAAI registrado como vendedor IA no sistema'
  ),
  'migration:022_closer_akaai'
);

-- ============================================================
-- VERIFICAÇÃO FINAL
-- Execute este SELECT para confirmar o registro:
-- SELECT id, name, email, role FROM public.users WHERE email = 'closer.akaai@agencia.com';
-- ============================================================
