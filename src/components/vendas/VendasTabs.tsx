'use client'

import Link from 'next/link'
import { Kanban, Users, MonitorPlay } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendasTabsProps {
  activeTab: 'kanban' | 'clientes' | 'projetos'
  kanbanCount: number
  clientsCount: number
  projectsCount?: number
}

export function VendasTabs({ activeTab, kanbanCount, clientsCount, projectsCount = 0 }: VendasTabsProps) {
  const tabs = [
    {
      key: 'kanban',
      href: '/vendas',
      label: 'Funil Kanban',
      icon: Kanban,
      count: kanbanCount,
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
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
              isActive ? 'bg-foreground/10 text-foreground' : 'bg-secondary text-muted-foreground'
            )}>
              {tab.count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
