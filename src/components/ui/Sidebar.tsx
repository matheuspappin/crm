'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'
import { NAV_ITEMS, CATEGORY_METADATA, type NavCategory } from '@/lib/nav'
import {
  Kanban,
  BarChart3,
  Code2,
  Crown,
  LogOut,
  Zap,
  ChevronRight,
  BookOpen,
  Briefcase,
  Package,
  Trophy,
  Target,
  Users,
  Send,
  Wallet,
  Layers,
  Bot,
  Settings,
  MonitorPlay,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

// Mapa de iconName → componente Lucide (client-side only)
const ICON_MAP: Record<string, LucideIcon> = {
  Kanban,
  BarChart3,
  Code2,
  Crown,
  BookOpen,
  Briefcase,
  Package,
  Trophy,
  Target,
  Users,
  Send,
  Wallet,
  Layers,
  Bot,
  Settings,
  MonitorPlay,
}

interface SidebarProps {
  user: User
  /** hrefs permitidos — pré-computados no Server Component para evitar hydration mismatch */
  allowedHrefs: string[]
  onNavigate?: () => void
  onClose?: () => void
}

const roleColors: Record<string, string> = {
  vendas: 'bg-indigo-500/20 text-foreground',
  trafego: 'bg-violet-500/20 text-violet-400',
  dev: 'bg-emerald-500/20 text-emerald-400',
  owner: 'bg-amber-500/20 text-amber-400',
}

const roleLabels: Record<string, string> = {
  vendas: 'Comercial',
  trafego: 'Tráfego',
  dev: 'Dev',
  owner: '👑 Owner',
}

export default function Sidebar({ user, allowedHrefs, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Filtra pelo allowedHrefs serializado do servidor — sem re-computar por role no client
  const visibleItems = NAV_ITEMS.filter((item) => allowedHrefs.includes(item.href))

  const categories: NavCategory[] = ['comercial', 'operacao', 'diretoria']

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Lógica precisa de item ativo para evitar múltiplos itens selecionados
  function isItemActive(href: string): boolean {
    if (href === '/vendas' || href === '/executivo') {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#0d0d14] border-r border-border p-4 select-none">
      {/* Logo */}
      <div className="flex items-center justify-between px-2 mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-foreground/20 border border-foreground/30">
            <Zap className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <span className="text-sm font-bold text-gradient">Super Admin</span>
            <p className="text-[11px] text-muted-foreground font-mono">CRM AKAAI CORE</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      {/* Navigation agrupada nos 3 Pilares */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1 space-y-5">
        {categories.map((cat) => {
          const categoryItems = visibleItems.filter((item) => item.category === cat)
          if (categoryItems.length === 0) return null

          const meta = CATEGORY_METADATA[cat]

          return (
            <div key={cat} className="space-y-1">
              <div className="px-2 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                  {meta.label}
                </span>
              </div>

              <div className="space-y-0.5">
                {categoryItems.map((item) => {
                  const Icon = ICON_MAP[item.iconName] ?? Kanban
                  const isActive = isItemActive(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'sidebar-link group transition-all duration-150',
                        isActive && 'active bg-foreground/10 text-foreground font-semibold border-l-2 border-foreground'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                      </div>
                      {isActive && <ChevronRight className="w-3 h-3 opacity-60 text-foreground" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Notificações */}
      <div className="pt-2 flex-shrink-0">
        <NotificationBell userId={user.id} />
      </div>

      {/* User info + Logout */}
      <div className="border-t border-border pt-4 mt-2 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-xs font-bold text-background flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', roleColors[user.role])}>
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs">Sair da Conta</span>
        </button>
      </div>
    </aside>
  )
}
