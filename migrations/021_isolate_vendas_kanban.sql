-- ============================================================
-- MIGRATION 021 — Isolar Funil Kanban por Vendedor
-- CRM God Mode | Cada Vendedor Vê Apenas os Seus Próprios Leads
-- ============================================================

-- 1. Atualizar RLS da tabela leads para vendas
DROP POLICY IF EXISTS "leads: vendas full access" ON public.leads;
DROP POLICY IF EXISTS "leads: vendas own leads" ON public.leads;

CREATE POLICY "leads: vendas own leads"
  ON public.leads
  FOR ALL
  TO public
  USING (
    (public.current_user_role() = 'vendas'::user_role AND assigned_to = auth.uid())
    OR public.current_user_role() = 'owner'::user_role
  )
  WITH CHECK (
    (public.current_user_role() = 'vendas'::user_role AND assigned_to = auth.uid())
    OR public.current_user_role() = 'owner'::user_role
  );

-- 2. Atualizar RLS da tabela interactions para vendas
DROP POLICY IF EXISTS "interactions: vendas full access" ON public.interactions;
DROP POLICY IF EXISTS "interactions: vendas own leads" ON public.interactions;

CREATE POLICY "interactions: vendas own leads"
  ON public.interactions
  FOR ALL
  TO public
  USING (
    (
      public.current_user_role() = 'vendas'::user_role AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.leads l
          WHERE l.id = lead_id
          AND l.assigned_to = auth.uid()
        )
      )
    )
    OR public.current_user_role() = 'owner'::user_role
  )
  WITH CHECK (
    (
      public.current_user_role() = 'vendas'::user_role AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.leads l
          WHERE l.id = lead_id
          AND l.assigned_to = auth.uid()
        )
      )
    )
    OR public.current_user_role() = 'owner'::user_role
  );

-- 3. Trigger de segurança: se vendedor inserir lead sem assigned_to, atribui automaticamente ao próprio vendedor
CREATE OR REPLACE FUNCTION public.handle_lead_auto_assign_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.assigned_to IS NULL AND auth.uid() IS NOT NULL THEN
    IF public.current_user_role() = 'vendas'::user_role THEN
      NEW.assigned_to = auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_auto_assign_seller ON public.leads;
CREATE TRIGGER trg_lead_auto_assign_seller
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_auto_assign_seller();
