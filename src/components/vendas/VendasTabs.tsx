'use client'

import Link from 'next/link'
import { Kanban, Users, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendasTabsProps {
  activeTab: 'lotes' | 'kanban' | 'clientes' | string
  kanbanCount?: number
  clientsCount?: number
  projectsCount?: number
  lotesCount?: number
}

export function VendasTabs({
  activeTab,
  kanbanCount,
  clientsCount,
  lotesCount,
}: VendasTabsProps) {
  // Apenas as etapas reais da operação comercial:
  // 1. Lotes (distribuir blocos de leads gerados/aquecidos)
  // 2. Kanban (atendimento e negociação pelos vendedores)
  // 3. Clientes (fechamentos e contratos)
  const tabs = [
    {
      key: 'lotes',
      href: '/vendas/lotes',
      label: '1. Gestor de Lotes',
      icon: Layers,
      count: lotesCount,
    },
    {
      key: 'kanban',
      href: '/vendas',
      label: '2. Funil Kanban',
      icon: Kanban,
      count: kanbanCount,
    },
    {
      key: 'clientes',
      href: '/vendas?tab=clientes',
      label: '3. Clientes Fechados',
      icon: Users,
      count: clientsCount,
    },
  ]

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
