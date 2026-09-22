-- ============================================================
-- MIGRATION 006 — Seed de Usuários Iniciais
-- CRM God Mode | Agência de Marketing
-- ============================================================
-- ATENÇÃO: Execute APÓS a 003_triggers.sql
-- ============================================================

-- Habilita pgcrypto para gerar hashes de senha
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_owner_id   UUID;
  v_vendas_id  UUID;
  v_dev_id     UUID;
  v_dados_id   UUID;
  v_instance   UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

  -- ============================================================
  -- 1. OWNER — vendaslachef@gmail.com
  -- ============================================================
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'vendaslachef@gmail.com';
  IF v_owner_id IS NULL THEN
    v_owner_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      v_owner_id, v_instance, 'authenticated', 'authenticated', 'vendaslachef@gmail.com', 
      crypt('Owner@2025!', gen_salt('bf')), NOW(), 
      '{"provider":"email","providers":["email"]}'::jsonb, 
      '{"name":"Admin Owner","role":"owner"}'::jsonb, FALSE, NOW(), NOW()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_owner_id, format('{"sub":"%s","email":"%s"}', v_owner_id::text, 'vendaslachef@gmail.com')::jsonb, 'email', 'vendaslachef@gmail.com', NOW(), NOW());
  ELSE
    UPDATE auth.users 
    SET raw_user_meta_data = '{"name":"Admin Owner","role":"owner"}'::jsonb, 
        encrypted_password = crypt('Owner@2025!', gen_salt('bf')), 
        updated_at = NOW() 
    WHERE id = v_owner_id;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (v_owner_id, 'Admin Owner', 'vendaslachef@gmail.com', 'owner')
  ON CONFLICT (id) DO UPDATE SET role = 'owner', name = 'Admin Owner', updated_at = NOW();

  -- ============================================================
  -- 2. VENDAS — teste@vendas.com
  -- ============================================================
  SELECT id INTO v_vendas_id FROM auth.users WHERE email = 'teste@vendas.com';
  IF v_vendas_id IS NULL THEN
    v_vendas_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      v_vendas_id, v_instance, 'authenticated', 'authenticated', 'teste@vendas.com', 
      crypt('Vendas@123!', gen_salt('bf')), NOW(), 
      '{"provider":"email","providers":["email"]}'::jsonb, 
      '{"name":"Teste Vendas","role":"vendas"}'::jsonb, FALSE, NOW(), NOW()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_vendas_id, format('{"sub":"%s","email":"%s"}', v_vendas_id::text, 'teste@vendas.com')::jsonb, 'email', 'teste@vendas.com', NOW(), NOW());
  ELSE
    UPDATE auth.users 
    SET raw_user_meta_data = '{"name":"Teste Vendas","role":"vendas"}'::jsonb, 
        encrypted_password = crypt('Vendas@123!', gen_salt('bf')), 
        updated_at = NOW() 
    WHERE id = v_vendas_id;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (v_vendas_id, 'Teste Vendas', 'teste@vendas.com', 'vendas')
  ON CONFLICT (id) DO UPDATE SET role = 'vendas', name = 'Teste Vendas', updated_at = NOW();

  -- ============================================================
  -- 3. DEV — teste@dev.com
  -- ============================================================
  SELECT id INTO v_dev_id FROM auth.users WHERE email = 'teste@dev.com';
  IF v_dev_id IS NULL THEN
    v_dev_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      v_dev_id, v_instance, 'authenticated', 'authenticated', 'teste@dev.com', 
      crypt('Dev@123!', gen_salt('bf')), NOW(), 
      '{"provider":"email","providers":["email"]}'::jsonb, 
      '{"name":"Teste Dev","role":"dev"}'::jsonb, FALSE, NOW(), NOW()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_dev_id, format('{"sub":"%s","email":"%s"}', v_dev_id::text, 'teste@dev.com')::jsonb, 'email', 'teste@dev.com', NOW(), NOW());
  ELSE
    UPDATE auth.users 
    SET raw_user_meta_data = '{"name":"Teste Dev","role":"dev"}'::jsonb, 
        encrypted_password = crypt('Dev@123!', gen_salt('bf')), 
        updated_at = NOW() 
    WHERE id = v_dev_id;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (v_dev_id, 'Teste Dev', 'teste@dev.com', 'dev')
  ON CONFLICT (id) DO UPDATE SET role = 'dev', name = 'Teste Dev', updated_at = NOW();

  -- ============================================================
  -- 4. TRÁFEGO/DADOS — teste@dados.com
  -- ============================================================
  SELECT id INTO v_dados_id FROM auth.users WHERE email = 'teste@dados.com';
  IF v_dados_id IS NULL THEN
    v_dados_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      v_dados_id, v_instance, 'authenticated', 'authenticated', 'teste@dados.com', 
      crypt('Dados@123!', gen_salt('bf')), NOW(), 
      '{"provider":"email","providers":["email"]}'::jsonb, 
      '{"name":"Teste Tráfego","role":"trafego"}'::jsonb, FALSE, NOW(), NOW()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_dados_id, format('{"sub":"%s","email":"%s"}', v_dados_id::text, 'teste@dados.com')::jsonb, 'email', 'teste@dados.com', NOW(), NOW());
  ELSE
    UPDATE auth.users 
    SET raw_user_meta_data = '{"name":"Teste Tráfego","role":"trafego"}'::jsonb, 
        encrypted_password = crypt('Dados@123!', gen_salt('bf')), 
        updated_at = NOW() 
    WHERE id = v_dados_id;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (v_dados_id, 'Teste Tráfego', 'teste@dados.com', 'trafego')
  ON CONFLICT (id) DO UPDATE SET role = 'trafego', name = 'Teste Tráfego', updated_at = NOW();

  RAISE NOTICE '✅ Usuários criados com sucesso e vinculados em auth.identities!';

END;
$$;
