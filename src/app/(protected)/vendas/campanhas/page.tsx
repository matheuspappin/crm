export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Bot } from 'lucide-react'
import { VendasTabs } from '@/components/vendas/VendasTabs'
import { MaquinaVendasManager } from '@/components/vendas/MaquinaVendasManager'

export default async function CampanhasPage() {
  const supabase = await createClient()

  const [
    { data: settings },
    { count: activeLeadsCount },
    { count: closedLeadsCount },
    { count: lotesCount },
  ] = await Promise.all([
    (supabase as any).from('system_settings').select('*'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("fechado","perdido")'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('status', ['fechado', 'perdido']),
    (supabase as any)
      .from('scraped_searches')
      .select('*', { count: 'exact', head: true }),
  ])

  const initialSettings: Record<string, any> = {}
  if (settings) {
    settings.forEach((item: any) => {
      initialSettings[item.key] = item.value
    })
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Máquina de Vendas Automática</h1>
            <p className="text-xs text-muted-foreground">
              Controle do Bot de Vendas da Empresa — tempo de delay pós-aquecimento, régua anti-vácuo e roteiros por nicho
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Comerciais */}
      <VendasTabs
        activeTab="campanhas"
        kanbanCount={activeLeadsCount || 0}
        clientsCount={closedLeadsCount || 0}
        lotesCount={lotesCount || 0}
      />

      {/* Conteúdo Principal: Painel de Controle da Máquina de Vendas */}
      <div className="mt-5">
        <MaquinaVendasManager initialSettings={initialSettings} />
      </div>
    </div>
  )
}
