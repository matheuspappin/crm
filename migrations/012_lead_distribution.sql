-- ============================================================
-- MIGRATION 012 — Lead Distribution (Round Robin)
-- CRM God Mode | Agência de Marketing
-- ============================================================

-- ============================================================
-- 1. Tabela: system_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS 'Armazena configurações globais do sistema (Ex: Modo de Distribuição de Leads)';

-- Inserir configurações padrão
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('lead_distribution_mode', '"round_robin"'::jsonb, 'Modo de distribuição: "round_robin" ou "manual"'),
  ('last_assigned_salesperson_id', 'null'::jsonb, 'UUID do último vendedor que recebeu um lead na roleta')
ON CONFLICT (key) DO NOTHING;

-- RLS para system_settings (Apenas owner pode alterar, todos podem ler)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública para system_settings"
ON public.system_settings FOR SELECT
USING (true);

CREATE POLICY "Owner pode atualizar system_settings"
ON public.system_settings FOR UPDATE
USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Owner pode inserir system_settings"
ON public.system_settings FOR INSERT
WITH CHECK ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );

-- ============================================================
-- 2. Trigger para Atribuição (Roleta / Round Robin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_assign_lead_round_robin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mode TEXT;
  v_last_assigned_id UUID;
  v_next_salesperson_id UUID;
BEGIN
  -- Se o lead já veio com um dono atribuído (criação manual pelo Admin), ignorar a roleta
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obter modo de distribuição atual
  SELECT value#>>'{}' INTO v_mode 
  FROM public.system_settings 
  WHERE key = 'lead_distribution_mode';
  
  IF v_mode = 'round_robin' THEN
    -- Obter UUID do último vendedor que recebeu lead
    BEGIN
      SELECT (value#>>'{}')::uuid INTO v_last_assigned_id 
      FROM public.system_settings 
      WHERE key = 'last_assigned_salesperson_id' AND value#>>'{}' IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      v_last_assigned_id := NULL;
    END;
    
    -- Tentar encontrar o próximo vendedor na fila (ordenado por ID)
    IF v_last_assigned_id IS NOT NULL THEN
      SELECT id INTO v_next_salesperson_id
      FROM public.users
      WHERE role = 'vendas' AND id > v_last_assigned_id
      ORDER BY id ASC
      LIMIT 1;
    END IF;

    -- Se não encontrou ninguem maior que o ultimo (chegou no fim da fila) ou se era NULL, pega o primeiro
    IF v_next_salesperson_id IS NULL THEN
      SELECT id INTO v_next_salesperson_id
      FROM public.users
      WHERE role = 'vendas'
      ORDER BY id ASC
      LIMIT 1;
    END IF;

    -- Se encontrou um vendedor válido na equipe, atribui e atualiza o estado da roleta
    IF v_next_salesperson_id IS NOT NULL THEN
      NEW.assigned_to := v_next_salesperson_id;
      
      UPDATE public.system_settings
      SET value = to_jsonb(v_next_salesperson_id::text), updated_at = NOW()
      WHERE key = 'last_assigned_salesperson_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar a trigger para rodar antes do INSERT na tabela leads
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
CREATE TRIGGER on_lead_inserted
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_lead_round_robin();
