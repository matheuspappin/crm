'use client'

import { useState, useMemo } from 'react'
import type { Lead, LeadStatus } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { LeadTimelineModal } from './LeadTimelineModal'
import {
  Search, CheckCircle2, XCircle, Users, ChevronLeft, ChevronRight,
  Calendar, Building2, TrendingUp, Filter
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type FilterTab = 'todos' | 'fechado' | 'perdido'

const PAGE_SIZE = 12

const reasonLabels: Record<FilterTab, { label: string; icon: React.ReactNode; color: string }> = {
  todos:   { label: 'Todos',   icon: <Users className="w-3.5 h-3.5" />,        color: 'text-foreground' },
  fechado: { label: 'Ganhos',  icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  perdido: { label: 'Perdidos',icon: <XCircle className="w-3.5 h-3.5" />,      color: 'text-red-400' },
}

interface ClientsTableProps {
  leads: Lead[]
}

export function ClientsTable({ leads }: ClientsTableProps) {
  const [filter, setFilter] = useState<FilterTab>('todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesFilter =
        filter === 'todos' || l.status === (filter as LeadStatus)

      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.company_name ?? '').toLowerCase().includes(q) ||
        (l.contact ?? '').toLowerCase().includes(q)

      return matchesFilter && matchesSearch
    })
  }, [leads, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPIs rápidos
  const kpis = useMemo(() => {
    const won = leads.filter((l) => l.status === 'fechado')
    const lost = leads.filter((l) => l.status === 'perdido')
    const wonValue = won.reduce((s, l) => s + (l.value || 0), 0)
    const winRate = leads.length > 0 ? (won.length / leads.length) * 100 : 0
    return { won: won.length, lost: lost.length, wonValue, winRate }
  }, [leads])

  function handleFilterChange(f: FilterTab) {
    setFilter(f)
    setPage(1)
  }

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Total de Clientes',
            value: leads.length,
            icon: <Users className="w-4 h-4 text-foreground" />,
            bg: 'bg-foreground/10 border-border/40',
            valueClass: 'text-foreground',
          },
          {
            label: 'Contratos Fechados',
            value: kpis.won,
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            valueClass: 'text-emerald-400',
          },
          {
            label: 'Negócios Perdidos',
            value: kpis.lost,
            icon: <XCircle className="w-4 h-4 text-red-400" />,
            bg: 'bg-red-500/10 border-red-500/20',
            valueClass: 'text-red-400',
          },
          {
            label: 'Receita Gerada',
            value: formatCurrency(kpis.wonValue),
            icon: <TrendingUp className="w-4 h-4 text-violet-400" />,
            bg: 'bg-violet-500/10 border-violet-500/20',
            valueClass: 'text-violet-400',
          },
        ].map((k) => (
          <div key={k.label} className={`glass-card border ${k.bg} p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${k.bg}`}>
              {k.icon}
            </div>
            <div>
              <p className={`text-xl font-bold ${k.valueClass}`}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tabs de filtro */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          {(Object.keys(reasonLabels) as FilterTab[]).map((f) => {
            const { label, icon, color } = reasonLabels[f]
            const isActive = filter === f
            return (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-foreground/10 ' + color
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {icon}
                {label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-foreground/15' : 'bg-secondary'
                )}>
                  {f === 'todos' ? leads.length
                    : leads.filter((l) => l.status === f).length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Busca */}
        <div className="relative flex-1 min-w-52 max-w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, empresa ou contato..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {/* Resultado */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Finalizado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">No funil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 opacity-20" />
                      <span>Nenhum cliente encontrado</span>
                      {search && (
                        <button
                          onClick={() => handleSearch('')}
                          className="text-xs text-foreground/50 hover:text-foreground underline"
                        >
                          Limpar busca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((lead) => {
                  const isWon = lead.status === 'fechado'
                  const assignee = (lead as any).assigned_user?.name ?? '—'
                  const closedDate = lead.last_moved_at ?? lead.updated_at
                  const daysInFunnel = Math.round(
                    (new Date(closedDate).getTime() - new Date(lead.created_at).getTime())
                    / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-card/40 cursor-pointer transition-colors group"
                    >
                      {/* Nome */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold text-muted-foreground border border-border shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-[13px] group-hover:text-white transition-colors">
                              {lead.name}
                            </p>
                            {lead.contact && (
                              <p className="text-[10px] text-muted-foreground">{lead.contact}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3">
                        {lead.company_name ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {lead.company_name}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
                          isWon
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        )}>
                          {isWon ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isWon ? 'Fechado' : 'Perdido'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'text-sm font-semibold',
                          isWon ? 'text-emerald-400' : 'text-muted-foreground'
                        )}>
                          {formatCurrency(lead.value || 0)}
                        </span>
                      </td>

                      {/* Responsável */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{assignee}</span>
                      </td>

                      {/* Data finalizado */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(closedDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </td>

                      {/* Tempo no funil */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {daysInFunnel <= 0 ? '< 1 dia' : `${daysInFunnel} dia${daysInFunnel !== 1 ? 's' : ''}`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/30">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages} · {filtered.length} clientes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span key={`dot-${p}`} className="text-xs text-muted-foreground px-1">…</span>
                    )}
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs border transition-all',
                        p === page
                          ? 'bg-foreground/10 border-foreground/30 text-foreground font-semibold'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-card'
                      )}
                    >
                      {p}
                    </button>
                  </>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de timeline */}
      {selectedLead && (
        <LeadTimelineModal
          lead={selectedLead}
          isOpen={true}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}
