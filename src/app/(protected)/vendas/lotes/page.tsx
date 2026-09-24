export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Layers } from 'lucide-react'
import { VendasTabs } from '@/components/vendas/VendasTabs'
import { LotesManager, type BatchItem } from '@/components/vendas/LotesManager'

export default async function LotesPage() {
  const supabase = await createClient()
  const db = supabase as any

  const [
    { data: searches },
    { data: leadsData },
    { count: activeLeadsCount },
    { count: closedLeadsCount },
    { count: projectsCount },
  ] = await Promise.all([
    db
      .from('scraped_searches')
      .select('id, query, city, source, total_leads, created_at')
      .order('created_at', { ascending: false }),

    db
      .from('scraped_leads')
      .select('search_id, distribution_status'),

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

  // Agrupar contagens de disponibilidade por search_id
  const statsMap: Record<string, { available: number; distributed: number }> = {}
  if (leadsData && leadsData.length > 0) {
    for (const lead of leadsData) {
      if (!lead.search_id) continue
      if (!statsMap[lead.search_id]) {
        statsMap[lead.search_id] = { available: 0, distributed: 0 }
      }
      const st = lead.distribution_status || 'disponivel'
      if (st === 'disponivel') {
        statsMap[lead.search_id].available += 1
      } else {
        statsMap[lead.search_id].distributed += 1
      }
    }
  }

  const batches: BatchItem[] = (searches || []).map((s: any) => {
    const stats = statsMap[s.id] || { available: 0, distributed: 0 }
    return {
      id: s.id,
      query: s.query,
      city: s.city,
      source: s.source,
      total_leads: s.total_leads || (stats.available + stats.distributed),
      created_at: s.created_at,
      available_count: stats.available,
      distributed_count: stats.distributed,
    }
  })

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestão de Lotes de Leads</h1>
            <p className="text-xs text-muted-foreground">
              Inspecione o conteúdo dos pacotes gerados centralmente, acompanhe o frescor e distribua por lotes para a equipe comercial
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Comerciais */}
      <VendasTabs
        activeTab="lotes"
        kanbanCount={activeLeadsCount || 0}
        clientsCount={closedLeadsCount || 0}
        projectsCount={projectsCount || 0}
        lotesCount={batches.length}
      />

      {/* Conteúdo */}
      <div className="mt-5">
        <LotesManager initialBatches={batches} />
      </div>
    </div>
  )
}
