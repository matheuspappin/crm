'use client'

import Link from 'next/link'
import { Kanban, Users, MonitorPlay, Send, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendasTabsProps {
  activeTab: 'kanban' | 'campanhas' | 'clientes' | 'projetos' | 'lotes'
  kanbanCount: number
  clientsCount: number
  projectsCount?: number
  lotesCount?: number
}

export function VendasTabs({ activeTab, kanbanCount, clientsCount, projectsCount = 0, lotesCount }: VendasTabsProps) {
  const tabs = [
    {
      key: 'kanban',
      href: '/vendas',
      label: 'Funil Kanban',
      icon: Kanban,
      count: kanbanCount,
    },
    {
      key: 'campanhas',
      href: '/vendas/campanhas',
      label: 'Máquina de Vendas',
      icon: Send,
      count: undefined,
    },
    {
      key: 'lotes',
      href: '/vendas/lotes',
      label: 'Gestor de Lotes',
      icon: Layers,
      count: lotesCount,
    },
    {
      key: 'clientes',
      href: '/vendas?tab=clientes',
      label: 'Clientes',
      icon: Users,
      count: clientsCount,
    },
    {
      key: 'projetos',
      href: '/vendas/projetos',
      label: 'Projetos',
      icon: MonitorPlay,
      count: projectsCount,
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
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-foreground/10 text-foreground' : 'bg-secondary text-muted-foreground'
              )}>
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
