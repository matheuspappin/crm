-- ============================================================
-- MIGRATION 018 — Anti-Vácuo, Timeout Limits & Campaign Controls
-- CRM God Mode | Recuperação de Leads e Controle de Pausa
-- ============================================================

-- 1. Enriquecer public.outbound_campaigns com timeout e script anti-vácuo
ALTER TABLE public.outbound_campaigns
    ADD COLUMN IF NOT EXISTS timeout_hours INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN IF NOT EXISTS followup_script TEXT DEFAULT 'Oi {nome}, tudo bem? Imagino que a rotina aí na {empresa} esteja bem corrida! Passando só para confirmar se conseguiu ver a mensagem anterior que te enviei sobre a oportunidade de captação digital? Abraço!';

-- 2. Enriquecer public.outbound_dispatches com rastreabilidade de follow-up e expiração
ALTER TABLE public.outbound_dispatches
    ADD COLUMN IF NOT EXISTS followup_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dispatches_followup ON public.outbound_dispatches(followup_sent, is_expired);
CREATE INDEX IF NOT EXISTS idx_dispatches_sent_at ON public.outbound_dispatches(sent_at);

COMMENT ON COLUMN public.outbound_campaigns.timeout_hours IS 'Horas limite sem resposta antes de disparar o Anti-Vácuo';
COMMENT ON COLUMN public.outbound_campaigns.followup_script IS 'Template da mensagem de retomada (Anti-Vácuo)';
COMMENT ON COLUMN public.outbound_dispatches.followup_sent IS 'Se a mensagem de retomada anti-vácuo já foi enviada';
COMMENT ON COLUMN public.outbound_dispatches.is_expired IS 'Se o lead expirou após a tentativa de retomada sem responder';
