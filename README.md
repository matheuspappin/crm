# CRM God Mode — Agência de Marketing

> CRM e ERP centralizado em tempo real para agência enxuta de 3 pessoas.
> Stack: Next.js 15 · TypeScript · Tailwind CSS v4 · Supabase · pg_cron · Docker

---

## 🗺️ Estrutura do Projeto

```
crm/
├── migrations/          # Scripts SQL para rodar no Supabase (em ordem)
│   ├── 001_schema_base.sql      ← Tabelas + ENUMs + Indexes
│   ├── 002_rls_policies.sql     ← Row Level Security + Realtime
│   ├── 003_triggers.sql         ← Auto-criar project, SLA reset, auth hook
│   ├── 004_materialized_views.sql ← MVs do God Mode (MRR, CAC, Win Rate)
│   └── 005_pg_cron_jobs.sql     ← Cron jobs (SLA, MV refresh, Pixel check)
├── src/
│   ├── app/
│   │   ├── (protected)/         # Rotas protegidas por RBAC
│   │   │   ├── vendas/          # Painel Comercial (Kanban)
│   │   │   ├── trafego/         # Painel de Tráfego (CPL, ROI)
│   │   │   ├── dev/             # Painel de Engenharia (Fulfillment)
│   │   │   └── executivo/       # God Mode (Visão Executiva)
│   │   ├── api/webhooks/meta/   # Webhook Meta Lead Ads
│   │   ├── auth/callback/       # Auth callback Supabase
│   │   └── login/               # Página de login
│   ├── components/ui/           # Sidebar, UI components
│   ├── lib/supabase/            # Browser client, Server client, Middleware
│   ├── middleware.ts             # RBAC + proteção de rotas
│   └── types/database.ts        # Tipos TypeScript do schema
└── .env.local                   # Variáveis de ambiente (não commitado)
```

---

## 🚀 Setup Inicial

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite o .env.local com as credenciais do seu projeto Supabase
```

### 2. Rodar as migrations no Supabase

Acesse o **SQL Editor** do seu projeto Supabase e execute os scripts **em ordem**:

1. `migrations/001_schema_base.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_triggers.sql`
4. `migrations/004_materialized_views.sql`
5. `migrations/005_pg_cron_jobs.sql` ← **Requer** `pg_cron` habilitado em *Database → Extensions*

### 3. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 👥 RBAC — Roles e Acesso

| Role | Rota | Acesso |
|------|------|--------|
| `vendas` | `/vendas` | Kanban, interações, tarefas |
| `trafego` | `/trafego` | UTMs, CPL, ROI, campanhas |
| `dev` | `/dev` | Projetos, pixels, logs de webhook |
| `owner` | `/executivo` | God Mode + todas as rotas |

Para criar usuários com roles específicos, use o Supabase Dashboard → Authentication → Users e adicione `role` nos metadados:

```json
{ "role": "owner" }
```

---

## 🔗 Webhook Meta Lead Ads

**Endpoint:** `POST /api/webhooks/meta`

**Configuração no Meta Developers:**
1. App → Webhooks → Add Subscription → `Page`
2. **Callback URL:** `https://seu-dominio.com/api/webhooks/meta`
3. **Verify Token:** valor de `META_VERIFY_TOKEN` no `.env.local`
4. **Campos:** selecione `leadgen`

O sistema valida a assinatura HMAC em produção e insere o lead na coluna **"Novo"** do Kanban automaticamente.

---

## ⚙️ pg_cron — Jobs Automáticos

| Job | Frequência | Função |
|-----|-----------|--------|
| `crm-sla-check` | A cada 30 min | Badge vermelho em leads > 48h parados |
| `crm-refresh-materialized-views` | A cada hora | Atualiza MVs do God Mode |
| `crm-pixel-health-check` | A cada 15 min | Verifica pixels dos clientes |

**Verificar jobs:**
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

---

## 🔄 Fluxo de Dados

```
Meta Ads → POST /api/webhooks/meta
         → INSERT leads (status: 'novo')
         → Supabase Realtime WebSocket
         → Kanban pisca com novo card

Vendedor arrasta card para "fechado"
         → UPDATE leads.status = 'fechado'
         → Trigger on_lead_closed
         → INSERT projects (Painel do Dev)
         → MVs atualizam na próxima hora
         → God Mode atualiza MRR
```

---

## 📦 Tecnologias

- **Next.js 15** — App Router, Server Components, Route Handlers
- **TypeScript** — Tipos completos do schema do banco
- **Tailwind CSS v4** — Design system dark mode
- **Supabase** — PostgreSQL, Auth (email/senha), RLS, Realtime WebSockets
- **@dnd-kit** — Drag-and-drop do Kanban (a implementar)
- **recharts** — Gráficos (a implementar)
- **lucide-react** — Ícones
- **date-fns** — Formatação de datas em pt-BR
