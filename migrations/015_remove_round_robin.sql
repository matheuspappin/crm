-- ============================================================
-- MIGRATION 015 — Remove Lead Distribution (Round Robin)
-- ============================================================

-- Remove the trigger that automatically assigns leads via round robin
DROP TRIGGER IF EXISTS on_lead_inserted ON public.leads;
DROP FUNCTION IF EXISTS public.trg_assign_lead_round_robin();

-- Update the system settings to 'manual' distribution for clarity
UPDATE public.system_settings 
SET value = '"manual"'::jsonb, updated_at = NOW() 
WHERE key = 'lead_distribution_mode';
