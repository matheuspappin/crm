'use client'

import Link from 'next/link'
import { Kanban, Users, Layers, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendasTabsProps {
  activeTab: 'lotes' | 'campanhas' | 'kanban' | 'clientes' | string
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
  // A esteira comercial alinhada com as etapas reais:
  // 1. Gestor de Lotes (pacotes de leads minerados centralmente pelo Hunter)
  // 2. Máquina de Vendas (painel de controle do Bot da Empresa: delay, anti-vácuo, copies)
  // 3. Funil Kanban (atendimento humano e negociação com leads aquecidos)
  // 4. Clientes Fechados (histórico de vendas e contratos fechados)
  const tabs = [
    {
      key: 'lotes',
      href: '/vendas/lotes',
      label: '1. Gestor de Lotes',
      icon: Layers,
      count: lotesCount,
    },
    {
      key: 'campanhas',
      href: '/vendas/campanhas',
      label: '2. Máquina de Vendas',
      icon: Bot,
      count: undefined,
    },
    {
      key: 'kanban',
      href: '/vendas',
      label: '3. Funil Kanban',
      icon: Kanban,
      count: kanbanCount,
    },
    {
      key: 'clientes',
      href: '/vendas?tab=clientes',
      label: '4. Clientes Fechados',
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
