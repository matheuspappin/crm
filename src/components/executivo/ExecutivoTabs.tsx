'use client'

import Link from 'next/link'
import { Crown, Bot, Wallet, Package, Users, Briefcase, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ExecutivoTabKey =
  | 'dashboard'
  | 'configuracoes'
  | 'carteira'
  | 'pricing'
  | 'usuarios'
  | 'projetos'
  | 'gamificacao'

interface ExecutivoTabsProps {
  activeTab: ExecutivoTabKey
}

export function ExecutivoTabs({ activeTab }: ExecutivoTabsProps) {
  const tabs = [
    {
      key: 'dashboard' as ExecutivoTabKey,
      href: '/executivo',
      label: 'Painel Geral',
      icon: Crown,
    },
    {
      key: 'configuracoes' as ExecutivoTabKey,
      href: '/executivo/configuracoes',
      label: 'Automação & Bot',
      icon: Bot,
    },
    {
      key: 'carteira' as ExecutivoTabKey,
      href: '/executivo/carteira',
      label: 'Carteira & MRR',
      icon: Wallet,
    },
    {
      key: 'pricing' as ExecutivoTabKey,
      href: '/executivo/pricing',
      label: 'Catálogo & Preços',
      icon: Package,
    },
    {
      key: 'usuarios' as ExecutivoTabKey,
      href: '/executivo/usuarios',
      label: 'Equipe & Acessos',
      icon: Users,
    },
    {
      key: 'projetos' as ExecutivoTabKey,
      href: '/executivo/projetos',
      label: 'Auditoria de Projetos',
      icon: Briefcase,
    },
    {
      key: 'gamificacao' as ExecutivoTabKey,
      href: '/executivo/gamificacao',
      label: 'Metas da Equipe',
      icon: Target,
    },
  ]

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto custom-scrollbar mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.key
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap rounded-t-lg',
              isActive
                ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-secondary/40'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
