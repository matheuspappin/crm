export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Kanban, Users } from 'lucide-react'
import type { Lead } from '@/types/database'
import { KanbanBoard } from '@/components/vendas/KanbanBoard'
import { NewLeadButton } from '@/components/vendas/NewLeadButton'
import { ClientsTable } from '@/components/vendas/ClientsTable'
import { VendasTabs } from '@/components/vendas/VendasTabs'
import { SellerFilterSelect } from '@/components/vendas/SellerFilterSelect'

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; vendedor?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab === 'clientes' ? 'clientes' : 'kanban'

  const supabase = await createClient()
  const db = supabase as any

  // 1. Obter usuário logado e perfil de acesso
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: currentUser } = await db
    .from('users')
    .select('id, name, email, role')
    .eq('id', authUser?.id || '')
    .maybeSingle()

  const isOwner = currentUser?.role === 'owner'
  const isSeller = currentUser?.role === 'vendas'

  // 2. Determinar filtro de vendedor:
  // Se for vendedor: isolamento estrito — apenas os seus próprios leads
  // Se for owner: pode filtrar por um vendedor específico ou ver 'todos'
  let sellerFilter: string | null = null
  if (isSeller) {
    sellerFilter = currentUser?.id || authUser?.id || null
  } else if (isOwner && params.vendedor && params.vendedor !== 'todos') {
    sellerFilter = params.vendedor
  }

  // 3. Montar queries filtradas
  let activeQuery = supabase
    .from('leads')
    .select('*, assigned_user:users!assigned_to(name, email, role)')
    .not('status', 'in', '("fechado","perdido")')
    .order('board_order', { ascending: true })
    .order('created_at', { ascending: false })

  let closedQuery = supabase
    .from('leads')
    .select('*, assigned_user:users!assigned_to(name, email, role)')
    .in('status', ['fechado', 'perdido'])
    .order('last_moved_at', { ascending: false })

  if (sellerFilter) {
    activeQuery = activeQuery.eq('assigned_to', sellerFilter)
    closedQuery = closedQuery.eq('assigned_to', sellerFilter)
  }

  const [{ data: activeLeads }, { data: closedLeads }, { data: sellers }, { count: projectsCount }, { count: lotesCount }] = await Promise.all([
    activeQuery,
    closedQuery,
    db
      .from('users')
      .select('id, name')
      .in('role', ['vendas', 'owner'])
      .order('name', { ascending: true }),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'entregue'),
    (supabase as any)
      .from('scraped_searches')
      .select('*', { count: 'exact', head: true })
      .neq('source', 'aquecedor_leads'),
  ])

  const activeLeadsData = ((activeLeads ?? []) as unknown as Lead[])
  const closedLeadsData = ((closedLeads ?? []) as unknown as Lead[])
  const sellersData = (sellers ?? []) as { id: string; name: string }[]

  // Vendedor selecionado no caso do Super Admin
  const filteredSellerName = sellerFilter && isOwner
    ? sellersData.find((s) => s.id === sellerFilter)?.name
    : null

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <Kanban className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isSeller ? 'Meu Funil de Vendas' : 'Painel Comercial da Agência'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isSeller
                ? activeTab === 'kanban'
                  ? 'Seus leads atribuídos em negociação ativa'
                  : `${closedLeadsData.length} cliente(s) finalizado(s) na sua carteira`
                : filteredSellerName
                ? `Exibindo leads atribuídos a ${filteredSellerName}`
                : activeTab === 'kanban'
                ? 'Funil Kanban geral de todos os vendedores'
                : `${closedLeadsData.length} clientes finalizados na agência`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Vendedor exclusivo para o Super Admin */}
          {isOwner && (
            <SellerFilterSelect
              sellers={sellersData}
              currentSeller={params.vendedor || 'todos'}
              activeTab={activeTab}
            />
          )}

          <NewLeadButton
            sellers={sellersData}
            currentUserId={currentUser?.id || authUser?.id}
            isSeller={isSeller}
          />
        </div>
      </div>

      {/* Tabs */}
      <VendasTabs
        activeTab={activeTab}
        kanbanCount={activeLeadsData.length}
        clientsCount={closedLeadsData.length}
        projectsCount={projectsCount || 0}
        lotesCount={lotesCount || 0}
        isOwner={isOwner}
      />

      {/* Content */}
      <div className="mt-5">
        {activeTab === 'kanban' ? (
          <KanbanBoard
            initialLeads={activeLeadsData}
            sellerFilter={sellerFilter}
          />
        ) : (
          <ClientsTable leads={closedLeadsData} />
        )}
      </div>
    </div>
  )
}
