export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Kanban, Users } from 'lucide-react'
import type { Lead } from '@/types/database'
import { KanbanBoard } from '@/components/vendas/KanbanBoard'
import { NewLeadButton } from '@/components/vendas/NewLeadButton'
import { ClientsTable } from '@/components/vendas/ClientsTable'
import { VendasTabs } from '@/components/vendas/VendasTabs'

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab === 'clientes' ? 'clientes' : 'kanban'

  const supabase = await createClient()

  const [{ data: activeLeads }, { data: closedLeads }, { data: sellers }, { count: projectsCount }] = await Promise.all([
    // Leads ativos para o Kanban (exclui fechado e perdido)
    supabase
      .from('leads')
      .select('*, assigned_user:users!assigned_to(name, email, role)')
      .not('status', 'in', '("fechado","perdido")')
      .order('board_order', { ascending: true })
      .order('created_at', { ascending: false }),

    // Clientes finalizados (fechado + perdido)
    supabase
      .from('leads')
      .select('*, assigned_user:users!assigned_to(name, email, role)')
      .in('status', ['fechado', 'perdido'])
      .order('last_moved_at', { ascending: false }),

    supabase
      .from('users')
      .select('id, name')
      .in('role', ['vendas', 'owner']),
      
    // Count active projects
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'entregue'),
  ])

  const activeLeadsData = ((activeLeads ?? []) as unknown as Lead[])
  const closedLeadsData = ((closedLeads ?? []) as unknown as Lead[])
  const sellersData = sellers ?? []

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <Kanban className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel Comercial</h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'kanban' ? 'Funil Kanban em tempo real' : `${closedLeadsData.length} clientes finalizados`}
            </p>
          </div>
        </div>
        {activeTab === 'kanban' && <NewLeadButton sellers={sellersData} />}
      </div>

      {/* Tabs */}
      <VendasTabs
        activeTab={activeTab}
        kanbanCount={activeLeadsData.length}
        clientsCount={closedLeadsData.length}
        projectsCount={projectsCount || 0}
      />

      {/* Content */}
      <div className="mt-5">
        {activeTab === 'kanban' ? (
          <KanbanBoard initialLeads={activeLeadsData} />
        ) : (
          <ClientsTable leads={closedLeadsData} />
        )}
      </div>
    </div>
  )
}

