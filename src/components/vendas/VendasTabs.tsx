'use client'

import Link from 'next/link'
import { Kanban, Users, Layers, MonitorPlay } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendasTabsProps {
  activeTab: 'lotes' | 'kanban' | 'clientes' | 'projetos' | string
  kanbanCount?: number
  clientsCount?: number
  projectsCount?: number
  lotesCount?: number
  isOwner?: boolean
}

export function VendasTabs({
  activeTab,
  kanbanCount,
  clientsCount,
  projectsCount,
  lotesCount,
  isOwner = true,
}: VendasTabsProps) {
  // A esteira comercial focada no CRM:
  // 1. Gestor de Lotes: O Super Admin visualiza e distribui os blocos de leads quentes para os vendedores
  // 2. Funil Kanban: Os vendedores recebem os leads quentes, negociam e avançam no pipeline
  // 3. Clientes Fechados: Gestão dos contratos e clientes conquistados
  // 4. Projetos em Andamento: Acompanhamento de entregas, homologação e revisão com o cliente
  const allTabs = [
    {
      key: 'lotes',
      href: '/vendas/lotes',
      label: '1. Gestor de Lotes',
      icon: Layers,
      count: lotesCount,
      adminOnly: true,
    },
    {
      key: 'kanban',
      href: '/vendas',
      label: isOwner ? '2. Funil Kanban' : 'Meu Funil Kanban',
      icon: Kanban,
      count: kanbanCount,
    },
    {
      key: 'clientes',
      href: '/vendas?tab=clientes',
      label: isOwner ? '3. Clientes Fechados' : 'Meus Clientes Fechados',
      icon: Users,
      count: clientsCount,
    },
    {
      key: 'projetos',
      href: '/vendas/projetos',
      label: isOwner ? '4. Projetos em Andamento' : 'Meus Projetos em Andamento',
      icon: MonitorPlay,
      count: projectsCount,
    },
  ]

  const tabs = allTabs.filter(t => !t.adminOnly || isOwner)

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto custom-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.key
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap rounded-t-lg',
              isActive
                ? 'border-foreground text-foreground font-semibold bg-foreground/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-secondary/30'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  isActive
                    ? 'bg-foreground/20 text-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
