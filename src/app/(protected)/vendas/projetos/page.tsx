export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { MonitorPlay } from 'lucide-react'
import type { Lead, Project } from '@/types/database'
import { VendasTabs } from '@/components/vendas/VendasTabs'
import { ProjectBoard } from '@/components/dev/ProjectBoard'

export default async function VendasProjetosPage() {
  const supabase = await createClient()

  const [{ data: activeLeads }, { data: closedLeads }, { count: projectsCount }, { data: projects }, { data: devs }] = await Promise.all([
    // Leads ativos para o Kanban
    supabase
      .from('leads')
      .select('id')
      .not('status', 'in', '("fechado","perdido")'),

    // Clientes finalizados
    supabase
      .from('leads')
      .select('id')
      .in('status', ['fechado', 'perdido']),

    // Count active projects
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'entregue'),

    // Buscar todos os projetos com detalhes
    supabase
      .from('projects')
      .select('*, lead:leads(*), assigned_dev_user:users!projects_assigned_dev_fkey(name, email)')
      .order('created_at', { ascending: false }),

    // Buscar devs
    supabase
      .from('users')
      .select('id, name')
      .in('role', ['dev', 'owner'])
  ])

  const projectsData = (projects ?? []) as unknown as Project[]
  const devsData = devs ?? []

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <MonitorPlay className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Projetos em Andamento</h1>
            <p className="text-xs text-muted-foreground">Acompanhe a entrega dos serviços vendidos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <VendasTabs
        activeTab="projetos"
        kanbanCount={activeLeads?.length || 0}
        clientsCount={closedLeads?.length || 0}
        projectsCount={projectsCount || 0}
      />

      {/* Content */}
      <div className="mt-5">
        <ProjectBoard initialProjects={projectsData} devs={devsData} viewerRole="vendas" />
      </div>
    </div>
  )
}

