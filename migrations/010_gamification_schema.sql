-- ============================================================
-- MIGRATION 010 — Gamification Schema
-- CRM God Mode | Agência de Marketing
-- ============================================================

-- ============================================================
-- 1. TIPOS ENUM
-- ============================================================
CREATE TYPE public.goal_period AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE public.goal_metric AS ENUM ('calls_made', 'meetings_booked', 'deals_closed', 'revenue_generated', 'leads_contacted');

-- ============================================================
-- 2. TABELA: gamification_profiles
-- ============================================================
CREATE TABLE public.gamification_profiles (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  xp          INTEGER NOT NULL DEFAULT 0,
  level       INTEGER NOT NULL DEFAULT 1,
  coins       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gamification_profiles IS 'Perfil de gamificação do usuário: Experiência, Nível e Moedas virtuais.';

-- ============================================================
-- 3. TABELA: gamification_goals
-- ============================================================
CREATE TABLE public.gamification_goals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  period       public.goal_period NOT NULL,
  metric       public.goal_metric NOT NULL,
  target_value NUMERIC NOT NULL,
  xp_reward    INTEGER NOT NULL DEFAULT 50,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gamification_goals IS 'Metas globais configuradas pelo Admin para recompensar os vendedores.';

-- ============================================================
-- 4. TABELA: user_goal_progress
-- ============================================================
CREATE TABLE public.user_goal_progress (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_id        UUID NOT NULL REFERENCES public.gamification_goals(id) ON DELETE CASCADE,
  current_value  NUMERIC NOT NULL DEFAULT 0,
  is_completed   BOOLEAN NOT NULL DEFAULT FALSE,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  completed_at   TIMESTAMPTZ,
  UNIQUE(user_id, goal_id, period_start)
);

COMMENT ON TABLE public.user_goal_progress IS 'Progresso individual de cada usuário nas metas ativas.';

-- ============================================================
-- 5. FUNCTION: Initialize Gamification Profiles
-- ============================================================
-- Cria automaticamente o perfil de gamificação para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.gamification_profiles (user_id, xp, level, coins)
  VALUES (NEW.id, 0, 1, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_gamification
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_gamification();

-- Inicializa para usuários existentes
INSERT INTO public.gamification_profiles (user_id, xp, level, coins)
SELECT id, 0, 1, 0 FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 6. FUNCTION: Helper to calculate period boundaries
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_goal_period_boundaries(p_period public.goal_period, OUT p_start DATE, OUT p_end DATE)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_period = 'daily' THEN
    p_start := CURRENT_DATE;
    p_end := CURRENT_DATE;
  ELSIF p_period = 'weekly' THEN
    p_start := date_trunc('week', CURRENT_DATE)::DATE;
    p_end := (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
  ELSIF p_period = 'monthly' THEN
    p_start := date_trunc('month', CURRENT_DATE)::DATE;
    p_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  END IF;
END;
$$;

-- ============================================================
-- 7. FUNCTION: Increment Goal Progress
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_goal_progress(p_user_id UUID, p_metric public.goal_metric, p_amount NUMERIC DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  goal RECORD;
  v_start DATE;
  v_end DATE;
  v_progress_id UUID;
  v_current_val NUMERIC;
  v_target_val NUMERIC;
  v_xp_reward INTEGER;
  v_was_completed BOOLEAN;
BEGIN
  -- Percorre todas as metas ativas para a métrica informada
  FOR goal IN 
    SELECT id, period, target_value, xp_reward 
    FROM public.gamification_goals 
    WHERE metric = p_metric AND is_active = TRUE
  LOOP
    -- Pega os limites do período (start_date, end_date)
    SELECT p_start, p_end INTO v_start, v_end 
    FROM public.get_goal_period_boundaries(goal.period);
    
    -- Insere o registro de progresso (se não existir) para este período
    INSERT INTO public.user_goal_progress (user_id, goal_id, current_value, is_completed, period_start, period_end)
    VALUES (p_user_id, goal.id, 0, FALSE, v_start, v_end)
    ON CONFLICT (user_id, goal_id, period_start) DO NOTHING;
    
    -- Pega o estado atual
    SELECT id, current_value, is_completed INTO v_progress_id, v_current_val, v_was_completed
    FROM public.user_goal_progress
    WHERE user_id = p_user_id AND goal_id = goal.id AND period_start = v_start;
    
    IF NOT v_was_completed THEN
      -- Incrementa valor
      UPDATE public.user_goal_progress
      SET current_value = current_value + p_amount
      WHERE id = v_progress_id
      RETURNING current_value INTO v_current_val;
      
      -- Verifica se concluiu a meta
      IF v_current_val >= goal.target_value THEN
        -- Marca como concluído
        UPDATE public.user_goal_progress
        SET is_completed = TRUE, completed_at = NOW()
        WHERE id = v_progress_id;
        
        -- Recompensa o usuário com XP
        UPDATE public.gamification_profiles
        SET xp = xp + goal.xp_reward
        WHERE user_id = p_user_id;
        
        -- Opcional: Adicionar lógica para subida de nível baseada em breakpoints de XP aqui
        -- Exemplo simples: a cada 1000 xp = 1 level
        UPDATE public.gamification_profiles
        SET level = 1 + FLOOR(xp / 1000)
        WHERE user_id = p_user_id;
      END IF;
    END IF;
    
  END LOOP;
END;
$$;

-- ============================================================
-- 8. TRIGGER: Interações (Calls)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_interaction_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    IF NEW.type = 'call' THEN
      PERFORM public.increment_goal_progress(NEW.created_by, 'calls_made'::public.goal_metric, 1);
    ELSIF NEW.type = 'meeting' THEN
      PERFORM public.increment_goal_progress(NEW.created_by, 'meetings_booked'::public.goal_metric, 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_interaction_created_gamification
  AFTER INSERT ON public.interactions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_interaction_gamification();

-- ============================================================
-- 9. TRIGGER: Vendas Fechadas e Valor de Contrato
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_lead_status_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
      -- Bateu a meta de deals fechados
      PERFORM public.increment_goal_progress(NEW.assigned_to, 'deals_closed'::public.goal_metric, 1);
      
      -- Incrementa a meta de receita gerada usando o valor do lead
      IF NEW.value > 0 THEN
         PERFORM public.increment_goal_progress(NEW.assigned_to, 'revenue_generated'::public.goal_metric, NEW.value);
      END IF;
    END IF;
    
    IF NEW.status IN ('reuniao', 'proposta', 'negociacao') AND (OLD.status = 'novo') THEN
      -- Se tirou de novo para alguma etapa ativa
      PERFORM public.increment_goal_progress(NEW.assigned_to, 'leads_contacted'::public.goal_metric, 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_updated_gamification
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE PROCEDURE public.handle_lead_status_gamification();

-- ============================================================
-- 10. POPULANDO METAS INICIAIS
-- ============================================================
INSERT INTO public.gamification_goals (title, description, period, metric, target_value, xp_reward) VALUES 
('Ligações do Dia', 'Faça 10 ligações no dia para esquentar seus contatos.', 'daily', 'calls_made', 10, 50),
('Reuniões Semanais', 'Agende e registre 5 reuniões na semana.', 'weekly', 'meetings_booked', 5, 200),
('Fechador Mensal', 'Feche 3 contratos este mês.', 'monthly', 'deals_closed', 3, 1000),
('Meta de Faturamento', 'Gere R$ 20.000 em novas vendas no mês.', 'monthly', 'revenue_generated', 20000, 2000);
