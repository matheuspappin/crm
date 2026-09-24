export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Wallet } from 'lucide-react'
import { ClientPortfolioManager } from '@/components/executivo/ClientPortfolioManager'

export default async function CarteiraClientesPage() {
  const supabase = await createClient()

  const [
    { data: closedLeads },
    { data: plans },
    { data: lostLeads },
  ] = await Promise.all([
    // Clientes que fecharam contrato
    supabase
      .from('leads')
      .select(`
        id, name, company_name, contact, niche, value, status, created_at, last_moved_at,
        project:projects(id, status, figma_url, prod_url),
        subscriptions:lead_subscriptions(
          id, status, custom_monthly, custom_setup_fee,
          pricing_plan:pricing_plans(
            id, name, monthly_fee, setup_fee,
            product:products(name, category)
          )
        )
      `)
      .eq('status', 'fechado')
      .order('last_moved_at', { ascending: false }),

    // Catálogo de planos de preços ativos
    supabase
      .from('pricing_plans')
      .select('*, product:products(*)')
      .eq('is_active', true),

    // Leads perdidos para reativação
    supabase
      .from('leads')
      .select('id, name, company_name, contact, niche, loss_reason, created_at')
      .eq('status', 'perdido')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Carteira Ativa de Clientes</h1>
            <p className="text-xs text-muted-foreground">
              Gestão de MRR, LTV, contratos recorrentes e esteiras de upsell por nicho
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal da Carteira */}
      <ClientPortfolioManager
        clients={(closedLeads || []) as any}
        pricingPlans={(plans || []) as any}
        lostLeads={(lostLeads || []) as any}
      />
    </div>
  )
}
