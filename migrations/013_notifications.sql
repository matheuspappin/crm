-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    related_entity_type TEXT,
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for Project Status Changes (Aguardando Aprovação / Revisão Solicitada)
CREATE OR REPLACE FUNCTION handle_project_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_name TEXT;
    v_assigned_vendas UUID;
    v_assigned_dev UUID;
BEGIN
    -- Obter o nome do lead e o vendedor responsável
    SELECT name, assigned_to INTO v_lead_name, v_assigned_vendas
    FROM public.leads
    WHERE id = NEW.lead_id;

    v_assigned_dev := NEW.assigned_dev;

    -- Se mudou para aguardando_aprovacao (Dev terminou e enviou para o Vendedor/Atendimento)
    IF NEW.status = 'aguardando_aprovacao' AND OLD.status IS DISTINCT FROM 'aguardando_aprovacao' THEN
        IF v_assigned_vendas IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (
                v_assigned_vendas,
                'Projeto Aguardando Aprovação',
                'O projeto do cliente ' || v_lead_name || ' foi enviado para aprovação.',
                'info',
                '/vendas/projetos',
                'project',
                NEW.id
            );
        END IF;
    END IF;

    -- Se mudou para revisao_solicitada (Vendedor pediu revisão para o Dev)
    IF NEW.status = 'revisao_solicitada' AND OLD.status IS DISTINCT FROM 'revisao_solicitada' THEN
        IF v_assigned_dev IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (
                v_assigned_dev,
                'Revisão Solicitada',
                'O projeto ' || v_lead_name || ' retornou para revisão.',
                'warning',
                '/dev',
                'project',
                NEW.id
            );
        END IF;
    END IF;

    -- Se mudou para entregue (Vendedor aprovou)
    IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue' THEN
        IF v_assigned_dev IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (
                v_assigned_dev,
                'Projeto Aprovado!',
                'O projeto ' || v_lead_name || ' foi aprovado pelo vendedor/cliente e finalizado.',
                'success',
                '/dev',
                'project',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_status_change ON public.projects;
CREATE TRIGGER on_project_status_change
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_project_status_notification();

-- Trigger for New Projects (Quando um projeto é criado para dev, avisa os devs ou o dev responsável se já atribuído)
CREATE OR REPLACE FUNCTION handle_new_project_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_name TEXT;
    v_assigned_vendas UUID;
BEGIN
    SELECT name, assigned_to INTO v_lead_name, v_assigned_vendas
    FROM public.leads
    WHERE id = NEW.lead_id;

    -- Se o dev já foi designado na criação
    IF NEW.assigned_dev IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
        VALUES (
            NEW.assigned_dev,
            'Novo Projeto Atribuído',
            'Você foi designado para o projeto: ' || v_lead_name,
            'info',
            '/dev',
            'project',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_project_created ON public.projects;
CREATE TRIGGER on_new_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_project_notification();


-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==========================================
-- Additional Notification Triggers
-- ==========================================

-- 1. Notification for Lead Assignment (Quando um lead cai para o vendedor)
CREATE OR REPLACE FUNCTION handle_lead_assignment_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_to IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (NEW.assigned_to, 'Novo Lead Recebido! 🎯', 'O lead ' || NEW.name || ' acabou de entrar no CRM e foi designado a você.', 'info', '/vendas', 'lead', NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (NEW.assigned_to, 'Novo Lead Atribuído! 🎯', 'O lead ' || NEW.name || ' foi designado a você.', 'info', '/vendas', 'lead', NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_assignment_notification ON public.leads;
CREATE TRIGGER on_lead_assignment_notification
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION handle_lead_assignment_notification();


-- 2. Notification for Sales (Quando um lead é fechado/ganho -> Avisar Owners)
CREATE OR REPLACE FUNCTION handle_lead_won_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
        FOR v_owner_id IN SELECT id FROM public.users WHERE role = 'owner'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (
                v_owner_id,
                'Nova Venda! 💰',
                'O lead ' || NEW.name || ' foi fechado com sucesso!',
                'success',
                '/executivo',
                'lead',
                NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_won_notification ON public.leads;
CREATE TRIGGER on_lead_won_notification
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION handle_lead_won_notification();


-- 3. Notification for Project Link Updates (Quando o dev edita o figma ou link de teste -> Avisar Vendedor)
CREATE OR REPLACE FUNCTION handle_project_links_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_name TEXT;
    v_assigned_vendas UUID;
BEGIN
    IF (NEW.figma_url IS DISTINCT FROM OLD.figma_url) OR (NEW.prod_url IS DISTINCT FROM OLD.prod_url) THEN
        SELECT name, assigned_to INTO v_lead_name, v_assigned_vendas
        FROM public.leads
        WHERE id = NEW.lead_id;

        IF v_assigned_vendas IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, related_entity_type, related_entity_id)
            VALUES (
                v_assigned_vendas,
                'Projeto Atualizado 🛠️',
                'O desenvolvedor atualizou os links do projeto: ' || v_lead_name,
                'info',
                '/vendas/projetos',
                'project',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_links_updated ON public.projects;
CREATE TRIGGER on_project_links_updated
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_project_links_notification();
