export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Send } from 'lucide-react'
import { VendasTabs } from '@/components/vendas/VendasTabs'
import { CampaignsManager } from '@/components/vendas/CampaignsManager'
import type { OutboundCampaign } from '@/types/database'

export default async function CampanhasPage() {
  const supabase = await createClient()

  const [
    { data: campaigns },
    { data: searches },
    { count: activeLeadsCount },
    { count: closedLeadsCount },
    { count: projectsCount },
  ] = await Promise.all([
    supabase
      .from('outbound_campaigns')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('scraped_searches')
      .select('id, query, city, total_leads, created_at')
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("fechado","perdido")'),

    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('status', ['fechado', 'perdido']),

    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'entregue'),
  ])

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <Send className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Máquina de Vendas Outbound</h1>
            <p className="text-xs text-muted-foreground">
              Dispare campanhas por nicho, analise taxas de resposta e alimente seu funil
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Comerciais */}
      <VendasTabs
        activeTab="campanhas"
        kanbanCount={activeLeadsCount || 0}
        clientsCount={closedLeadsCount || 0}
        projectsCount={projectsCount || 0}
        lotesCount={searches?.length || 0}
      />

      {/* Conteúdo */}
      <div className="mt-5">
        <CampaignsManager
          initialCampaigns={(campaigns || []) as OutboundCampaign[]}
          searches={searches || []}
        />
      </div>
    </div>
  )
}
