'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X, Check, Send, Users, ShieldAlert, Sparkles, Filter,
  Phone, Globe, CheckCircle2, Clock, Flame, ChevronRight,
  ExternalLink, Layers, ArrowRight, UserCheck
} from 'lucide-react'
import { LeadFreshnessTimer } from './LeadFreshnessTimer'
import type { ScrapedLead, ScrapedSearch, User } from '@/types/database'

interface BatchInspectorModalProps {
  searchId: string
  onClose: () => void
  onDistributed?: () => void
}

export function BatchInspectorModal({ searchId, onClose, onDistributed }: BatchInspectorModalProps) {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState<ScrapedSearch | null>(null)
  const [leads, setLeads] = useState<ScrapedLead[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [stats, setStats] = useState({ total: 0, disponivel: 0, distribuido: 0, em_campanha: 0 })

  // Seleção e Filtro
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'all' | 'disponivel' | 'distribuido'>('all')

  // Painel de Distribuição
  const [targetSellerId, setTargetSellerId] = useState<string>('')
  const [destination, setDestination] = useState<'kanban' | 'campaign'>('kanban')
  const [distributing, setDistributing] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Carregar dados completos do pacote
  const fetchBatchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/batch?search_id=${searchId}`)
      if (res.ok) {
        const data = await res.json()
        setSearch(data.search)
        setLeads(data.leads || [])
        setStats(data.stats || { total: 0, disponivel: 0, distribuido: 0, em_campanha: 0 })
        setSellers(data.sellers || [])
        if (data.sellers && data.sellers.length > 0 && !targetSellerId) {
          setTargetSellerId(data.sellers[0].id)
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do pacote:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchId) {
      fetchBatchData()
    }
  }, [searchId])

  // Filtragem dos leads exibidos
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const st = l.distribution_status || 'disponivel'
      if (filterStatus === 'disponivel') return st === 'disponivel'
      if (filterStatus === 'distribuido') return st === 'distribuido' || st === 'em_campanha'
      return true
    })
  }, [leads, filterStatus])

  // Helpers de seleção
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllAvailable = () => {
    const availableIds = leads
      .filter((l) => !l.distribution_status || l.distribution_status === 'disponivel')
      .map((l) => l.id)
    setSelectedIds(new Set(availableIds))
  }

  const selectTopN = (n: number) => {
    const available = leads
      .filter((l) => !l.distribution_status || l.distribution_status === 'disponivel')
      .slice(0, n)
      .map((l) => l.id)
    setSelectedIds(new Set(available))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Executar a Distribuição por Lote
  const handleDistribute = async () => {
    if (selectedIds.size === 0) {
      alert('Selecione ao menos um lead para encaminhar ao vendedor.')
      return
    }
    if (!targetSellerId) {
      alert('Selecione o vendedor que receberá o lote.')
      return
    }

    setDistributing(true)
    setFeedbackMsg(null)
    try {
      const res = await fetch('/api/leads/batch/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_id: searchId,
          lead_ids: Array.from(selectedIds),
          seller_id: targetSellerId,
          destination,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const selectedSeller = sellers.find(s => s.id === targetSellerId)
        setFeedbackMsg({
          type: 'success',
          text: `Sucesso! ${data.count} lead(s) encaminhados para ${selectedSeller?.name || 'o vendedor'} (${destination === 'kanban' ? 'Funil Kanban' : 'Máquina de Vendas'})!`
        })
        clearSelection()
        fetchBatchData()
        if (onDistributed) onDistributed()
      } else {
        const err = await res.json()
        setFeedbackMsg({ type: 'error', text: err.error || 'Erro ao distribuir lote' })
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Erro de conexão' })
    } finally {
      setDistributing(false)
    }
  }

  const isWarmed = search?.query.includes('AQUECIDOS') || search?.source === 'aquecedor_leads'

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-5 border-b border-border bg-secondary/30 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                isWarmed 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}>
                {isWarmed ? <Flame className="w-3 h-3 fill-amber-400" /> : <Layers className="w-3 h-3" />}
                {isWarmed ? 'Pacote Aquecido (Comprador)' : 'Mineração Google Maps'}
              </span>
              <span className="text-xs text-muted-foreground">• {search?.city || 'Brasil'}</span>
            </div>
            
            <h2 className="text-lg font-bold text-foreground truncate">
              {search?.query || 'Carregando pacote...'}
            </h2>

            {/* Timing do Pacote */}
            {search && (
              <div className="flex items-center gap-2 pt-1">
                <LeadFreshnessTimer createdAt={search.created_at} prefix="Lote gerado" variant="detailed" />
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estatísticas Rápidas & Filtros */}
        <div className="px-5 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Total no Lote:</span>
              <span className="px-2 py-0.5 rounded-md bg-secondary font-bold text-foreground">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-medium">Disponíveis:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">{stats.disponivel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400 font-medium">Já Distribuídos:</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-bold border border-purple-500/30">{stats.distribuido + stats.em_campanha}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'all' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Todos ({leads.length})
            </button>
            <button
              onClick={() => setFilterStatus('disponivel')}
              className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'disponivel' ? 'bg-emerald-500 text-black font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Disponíveis ({stats.disponivel})
            </button>
            <button
              onClick={() => setFilterStatus('distribuido')}
              className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'distribuido' ? 'bg-purple-500 text-white font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Distribuídos ({stats.distribuido + stats.em_campanha})
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Seleção */}
        <div className="px-5 py-2.5 bg-secondary/20 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Seleção Rápida:</span>
            <button
              onClick={selectAllAvailable}
              className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
            >
              Todos Disponíveis ({stats.disponivel})
            </button>
            <button
              onClick={() => selectTopN(10)}
              className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
            >
              Top 10
            </button>
            <button
              onClick={() => selectTopN(20)}
              className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
            >
              Top 20
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-2 py-1 text-muted-foreground hover:text-red-400 transition-all underline text-[11px]"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="text-xs font-semibold">
            {selectedIds.size > 0 ? (
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                ✓ {selectedIds.size} lead(s) selecionados
              </span>
            ) : (
              <span className="text-muted-foreground">Nenhum lead selecionado</span>
            )}
          </div>
        </div>

        {/* Tabela de Conteúdo do Lote */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground text-sm">
              Carregando leads do pacote...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground text-sm">
              Nenhum lead encontrado neste filtro.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLeads.map((lead) => {
                const isSelected = selectedIds.has(lead.id)
                const isAvailable = !lead.distribution_status || lead.distribution_status === 'disponivel'
                const isAssigned = lead.distribution_status === 'distribuido' || lead.distribution_status === 'em_campanha'
                const cleanPhone = (lead.phone || '').replace(/\D/g, '')

                return (
                  <div
                    key={lead.id}
                    onClick={() => isAvailable && toggleSelect(lead.id)}
                    className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-foreground/5 border-l-4 border-l-emerald-500'
                        : 'hover:bg-secondary/30'
                    } ${!isAvailable ? 'opacity-80 cursor-default' : ''}`}
                  >
                    {/* Checkbox & Nome */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isAvailable) toggleSelect(lead.id)
                        }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : isAvailable
                            ? 'border-border bg-secondary hover:border-foreground/40'
                            : 'border-border/50 bg-secondary/50 cursor-not-allowed text-muted-foreground'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {lead.name}
                          </h4>
                          {lead.score && lead.score >= 90 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              🔥 Score {lead.score}
                            </span>
                          )}
                          {lead.has_website === false ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              Sem Site
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-secondary text-muted-foreground">
                              Com Site
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {lead.phone && (
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                              {lead.phone}
                            </a>
                          )}
                          {lead.address && (
                            <span className="truncate max-w-xs">{lead.address}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Freshness Timing e Status de Atribuição */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Timing do Lead Individual */}
                      <LeadFreshnessTimer
                        createdAt={lead.created_at}
                        prefix="Gerado"
                        variant="badge"
                      />

                      {/* Status de Distribuição */}
                      <div className="w-36 text-right">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            ● Disponível
                          </span>
                        ) : (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
                              <UserCheck className="w-3 h-3" />
                              {(lead as any).assigned_user?.name || 'Atribuído'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé: Painel de Distribuição por Lotes */}
        <div className="p-4 sm:p-5 border-t border-border bg-card/95 backdrop-blur-sm space-y-3">
          {feedbackMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                : 'bg-red-500/15 text-red-300 border border-red-500/30'
            }`}>
              <span>{feedbackMsg.text}</span>
              <button onClick={() => setFeedbackMsg(null)} className="text-foreground hover:opacity-75">✕</button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Escolha do Vendedor & Destino */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Encaminhar para o Vendedor:
                </label>
                <select
                  value={targetSellerId}
                  onChange={(e) => setTargetSellerId(e.target.value)}
                  className="text-xs bg-secondary border border-border rounded-xl px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-foreground min-w-[200px]"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role === 'owner' ? 'Admin' : 'Vendas'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Destino do Lote:
                </label>
                <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-xl border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setDestination('kanban')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      destination === 'kanban'
                        ? 'bg-foreground text-background font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📌 Funil Kanban
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestination('campaign')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      destination === 'campaign'
                        ? 'bg-foreground text-background font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ⚡ Máquina Outbound
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de Envio do Lote */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleDistribute}
                disabled={distributing || selectedIds.size === 0}
                className="px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {distributing ? (
                  'Distribuindo Lote...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Encaminhar Lote ({selectedIds.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
