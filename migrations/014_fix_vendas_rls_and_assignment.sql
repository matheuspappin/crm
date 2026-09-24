-- ============================================================
-- MIGRATION 014 — Fix Vendas RLS & Reassign on Close
-- ============================================================

-- 1. Fix RLS Syntax Error in projects (missing parenthesis in EXISTS)
DROP POLICY IF EXISTS "projects: vendas read own active" ON public.projects;
DROP POLICY IF EXISTS "projects: vendas update own active" ON public.projects;
DROP POLICY IF EXISTS "projects: vendas read own" ON public.projects;

CREATE POLICY "projects: vendas read own active"
  ON public.projects
  FOR SELECT
  USING (
    public.current_user_role() = 'vendas'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.assigned_to = auth.uid()
    )
  );

CREATE POLICY "projects: vendas update own active"
  ON public.projects
  FOR UPDATE
  USING (
    public.current_user_role() = 'vendas'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.assigned_to = auth.uid()
    )
  );

-- 2. Atualizar o trigger de mudança de status para reatribuir o lead 
-- ao vendedor que o fechou.
CREATE OR REPLACE FUNCTION public.handle_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_moved_at = NOW();
    NEW.sla_alerted = FALSE;
    
    IF NEW.status = 'fechado' AND auth.uid() IS NOT NULL THEN
      SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
      IF v_role = 'vendas' THEN
        NEW.assigned_to = auth.uid();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
