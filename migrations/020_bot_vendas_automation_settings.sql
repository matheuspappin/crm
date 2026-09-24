-- ============================================================
-- MIGRATION 020 — Bot de Vendas Automation & Offer Delay Settings
-- CRM God Mode | Controle Central de Disparo Automático
-- ============================================================

-- Inserir ou atualizar chaves globais de automação da Máquina de Vendas
INSERT INTO public.system_settings (key, value, description)
VALUES 
  (
    'bot_oferta_delay_horas', 
    '24'::jsonb, 
    'Tempo de espera (em horas) para o Bot da Empresa disparar a oferta após o aquecedor confirmar ausência de site'
  ),
  (
    'bot_vendas_status', 
    '"active"'::jsonb, 
    'Status geral do Bot de Vendas: "active" (ativo) ou "paused" (pausado)'
  ),
  (
    'bot_antivacuo_timeout_horas', 
    '24'::jsonb, 
    'Tempo limite sem resposta (em horas) para o Bot disparar a mensagem de retomada anti-vácuo'
  ),
  (
    'bot_scripts_nicho',
    '{
      "estetica": "Olá! Notei o perfil da {empresa} aqui em {cidade}. Desenvolvemos estruturas completas de captação e sites profissionais focados em lotar a agenda de procedimentos estéticos no WhatsApp. Gostaria de ver uma demonstração de como estruturamos esse modelo para clínicas?",
      "psicologia": "Olá {empresa}! Vi seu trabalho de psicologia em {cidade}. Criamos sites profissionais e posicionamento ético no Google para consultórios atraírem pacientes particulares. Faz sentido conversarmos 5 minutos?",
      "odontologia": "Olá! Acompanho o trabalho da {empresa} em {cidade}. Desenvolvemos páginas de alta conversão para consultórios odontológicos captarem procedimentos particulares no WhatsApp. Podemos trocar uma ideia rápida?",
      "advocacia": "Olá! Conheço a atuação do escritório {empresa} em {cidade}. Estruturamos sites de autoridade jurídica para escritórios de advocacia captarem clientes qualificados. Gostaria de conhecer nosso modelo?",
      "geral": "Olá! Acompanho o crescimento da {empresa} aqui em {cidade}. Desenvolvemos sites modernos e estruturas de vendas para multiplicar o volume de clientes pelo Google e WhatsApp. Podemos conversar rapidamente?"
    }'::jsonb,
    'Scripts de oferta comercial disparados pelo Bot de Vendas da Agência segmentados por nicho'
  ),
  (
    'bot_followup_scripts_nicho',
    '{
      "estetica": "Olá {nome}, tudo bem? Imagino que a rotina aí na clínica esteja bem corrida! Passando só para confirmar se conseguiu ver a mensagem anterior que enviei sobre o site profissional para a clínica? Um abraço!",
      "psicologia": "Olá {nome}! Imagino que a agenda de atendimentos esteja cheia. Só passando para checar se conseguiu dar uma olhada na mensagem anterior sobre o site do consultório? Abraço!",
      "geral": "Oi {nome}, tudo bem? Sei que a rotina na {empresa} é bem movimentada. Só passei para confirmar se conseguiu ver a mensagem anterior que te enviei sobre a criação do site? Abraço!"
    }'::jsonb,
    'Scripts de retomada (Anti-Vácuo) disparados pelo Bot de Vendas quando o lead não responde'
  )
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description, updated_at = NOW();
