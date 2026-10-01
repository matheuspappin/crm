export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { MonitorPlay } from 'lucide-react'
import type { Lead, Project } from '@/types/database'
import { VendasTabs } from '@/components/vendas/VendasTabs'
import { ProjectBoard } from '@/components/dev/ProjectBoard'

export default async function VendasProjetosPage() {
  const supabase = await createClient()
  const db = supabase as any

  // 1. Obter usuário logado e perfil
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: currentUser } = await db
    .from('users')
    .select('id, name, email, role')
    .eq('id', authUser?.id || '')
    .maybeSingle()

  const isOwner = currentUser?.role === 'owner'
  const isSeller = currentUser?.role === 'vendas'

  // 2. Montar queries com isolamento por vendedor se não for owner
  let activeLeadsQuery = supabase
    .from('leads')
    .select('id')
    .not('status', 'in', '("fechado","perdido")')

  let closedLeadsQuery = supabase
    .from('leads')
    .select('id')
    .in('status', ['fechado', 'perdido'])

  let projectsCountQuery = supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'entregue')

  let projectsQuery = supabase
    .from('projects')
    .select('*, lead:leads(*), assigned_dev_user:users!projects_assigned_dev_fkey(name, email)')
    .order('created_at', { ascending: false })

  if (isSeller && currentUser?.id) {
    activeLeadsQuery = activeLeadsQuery.eq('assigned_to', currentUser.id)
    closedLeadsQuery = closedLeadsQuery.eq('assigned_to', currentUser.id)
  }

  const [
    { data: activeLeads },
    { data: closedLeads },
    { count: projectsCount },
    { data: projects },
    { data: devs },
    { count: lotesCount }
  ] = await Promise.all([
    activeLeadsQuery,
    closedLeadsQuery,
    projectsCountQuery,
    projectsQuery,
    supabase
      .from('users')
      .select('id, name')
      .in('role', ['dev', 'owner']),
    (supabase as any)
      .from('scraped_searches')
      .select('*', { count: 'exact', head: true })
      .neq('source', 'aquecedor_leads'),
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
            <h1 className="text-xl font-bold text-foreground">
              {isSeller ? 'Meus Projetos em Andamento' : 'Painel de Projetos em Andamento'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isSeller
                ? 'Acompanhe as entregas dos seus clientes fechados, envie links de homologação e solicite revisões'
                : 'Acompanhe todas as entregas técnicas, links de homologação e aprovações com os clientes'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <VendasTabs
        activeTab="projetos"
        kanbanCount={activeLeads?.length || 0}
        clientsCount={closedLeads?.length || 0}
        projectsCount={projectsCount || 0}
        lotesCount={lotesCount || 0}
        isOwner={isOwner}
      />

      {/* Content */}
      <div className="mt-5">
        <ProjectBoard
          initialProjects={projectsData}
          devs={devsData}
          viewerRole={isOwner ? 'owner' : 'vendas'}
        />
      </div>
    </div>
  )
}
