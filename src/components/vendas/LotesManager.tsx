'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layers, Flame, MapPin, Users, Send, CheckCircle2,
  Clock, Search, ArrowUpRight, Zap, Eye, RefreshCw, UserCheck
} from 'lucide-react'
import { LeadFreshnessTimer } from './LeadFreshnessTimer'
import { BatchInspectorModal } from './BatchInspectorModal'

export interface AssignedSellerSummary {
  id: string
  name: string
  count: number
}

export interface BatchItem {
  id: string
  query: string
  city: string
  source: string | null
  total_leads: number
  created_at: string
  available_count: number
  distributed_count: number
  assigned_sellers?: AssignedSellerSummary[]
}

interface LotesManagerProps {
  initialBatches: BatchItem[]
}

export function LotesManager({ initialBatches }: LotesManagerProps) {
  const router = useRouter()
  const [batches, setBatches] = useState<BatchItem[]>(initialBatches)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'aquecidos' | 'maps' | 'disponiveis' | 'distribuidos'>('all')
  const [inspectingSearchId, setInspectingSearchId] = useState<string | null>(null)

  // Totais agregados
  const totalLeads = batches.reduce((acc, b) => acc + (b.total_leads || 0), 0)
  const totalDisponiveis = batches.reduce((acc, b) => acc + (b.available_count || 0), 0)
  const totalDistribuidos = batches.reduce((acc, b) => acc + (b.distributed_count || 0), 0)

  // Filtragem (incluindo busca por nome do vendedor delegado)
  const filteredBatches = batches.filter((b) => {
    const isWarmed = b.query.includes('AQUECIDOS') || b.source === 'aquecedor_leads'
    if (filterType === 'aquecidos' && !isWarmed) return false
    if (filterType === 'maps' && isWarmed) return false
    if (filterType === 'disponiveis' && b.available_count === 0) return false
    if (filterType === 'distribuidos' && (b.distributed_count === 0 || b.available_count > 0)) return false

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const matchesQuery = b.query.toLowerCase().includes(q)
      const matchesCity = b.city && b.city.toLowerCase().includes(q)
      const matchesSeller = b.assigned_sellers?.some((s) => s.name.toLowerCase().includes(q))
      if (!matchesQuery && !matchesCity && !matchesSeller) return false
    }
    return true
  })

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo Executivo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Total de Pacotes</span>
            <span className="text-2xl font-bold text-foreground">{batches.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground border border-border">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Leads Minerados</span>
            <span className="text-2xl font-bold text-foreground">{totalLeads}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 font-medium block">Prontos p/ Envio</span>
            <span className="text-2xl font-bold text-emerald-400">{totalDisponiveis}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-purple-400 font-medium block">Já Encaminhados</span>
            <span className="text-2xl font-bold text-purple-400">{totalDistribuidos}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/30 p-3 rounded-2xl border border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nicho, cidade ou vendedor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl border border-border text-xs shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'all' ? 'bg-background text-foreground shadow-sm font-bold' : 'text-muted-foreground'
              }`}
            >
              Todos ({batches.length})
            </button>
            <button
              onClick={() => setFilterType('aquecidos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterType === 'aquecidos' ? 'bg-amber-500 text-black shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Aquecidos
            </button>
            <button
              onClick={() => setFilterType('maps')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'maps' ? 'bg-background text-foreground shadow-sm font-bold' : 'text-muted-foreground'
              }`}
            >
              Google Maps
            </button>
            <button
              onClick={() => setFilterType('disponiveis')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'disponiveis' ? 'bg-emerald-500 text-black shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Disponíveis ({batches.filter((b) => b.available_count > 0).length})
            </button>
            <button
              onClick={() => setFilterType('distribuidos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'distribuidos' ? 'bg-purple-500 text-white shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Distribuídos ({batches.filter((b) => b.available_count === 0 && b.distributed_count > 0).length})
            </button>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all self-end sm:self-auto shrink-0"
          title="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid de Pacotes de Leads */}
      {filteredBatches.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-card">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-foreground">Nenhum pacote encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Os pacotes gerados no robô central (Lead Hunter ou Aquecedor de Leads) aparecerão aqui automaticamente para distribuição.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => {
            const isWarmed = batch.query.includes('AQUECIDOS') || batch.source === 'aquecedor_leads'
            const pctDistributed = batch.total_leads > 0 
              ? Math.min(100, Math.round((batch.distributed_count / batch.total_leads) * 100))
              : 0
            const hasAssignedSellers = batch.assigned_sellers && batch.assigned_sellers.length > 0

            return (
              <div
                key={batch.id}
                className="group relative rounded-2xl bg-card border border-border hover:border-foreground/30 p-5 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        isWarmed
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {isWarmed ? <Flame className="w-3 h-3 fill-amber-400" /> : <Layers className="w-3 h-3" />}
                        {isWarmed ? 'Aquecedor (Comprador)' : 'Google Maps'}
                      </span>

                      {/* Tag do Vendedor Delegado */}
                      {hasAssignedSellers && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 bg-purple-500/15 text-purple-300 border-purple-500/30">
                          <UserCheck className="w-3 h-3 text-purple-400" />
                          {batch.assigned_sellers!.length === 1
                            ? batch.assigned_sellers![0].name
                            : `${batch.assigned_sellers!.length} vendedores`}
                        </span>
                      )}
                    </div>

                    {/* Freshness Timing do Lote */}
                    <LeadFreshnessTimer
                      createdAt={batch.created_at}
                      prefix="Minerado"
                      variant="badge"
                    />
                  </div>

                  {/* Nome da Busca / Lote */}
                  <h3 className="text-sm font-bold text-foreground leading-snug group-hover:text-foreground/90">
                    {batch.query}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{batch.city || 'Brasil'}</span>
                  </div>

                  {/* Box de Informações de Delegação ao Vendedor */}
                  {hasAssignedSellers ? (
                    <div className="mt-3.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs">
                      <div className="flex items-center justify-between text-purple-300 font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                          {batch.available_count === 0 ? 'Delegado integralmente para:' : 'Enviado parcialmente para:'}
                        </span>
                        {batch.available_count === 0 ? (
                          <span className="text-[10px] font-bold bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded border border-purple-400/30">
                            100% Entregue
                          </span>
                        ) : (
                          <span className="text-[10px] text-purple-300">
                            {batch.distributed_count} leads
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {batch.assigned_sellers!.map((seller) => (
                          <div key={seller.id} className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-semibold flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                              {seller.name}
                            </span>
                            <span className="text-[11px] font-bold text-purple-300 shrink-0 ml-2">
                              {seller.count} {seller.count === 1 ? 'lead' : 'leads'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3.5 p-2.5 rounded-xl bg-secondary/30 border border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        Aguardando envio comercial
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Disponível
                      </span>
                    </div>
                  )}

                  {/* Barra de Progresso de Distribuição */}
                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso de Envio:</span>
                      <span className="font-semibold text-foreground">{pctDistributed}%</span>
                    </div>

                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden flex">
                      <div
                        className="bg-purple-500 transition-all duration-500"
                        style={{ width: `${pctDistributed}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                      <span>Total: <strong className="text-foreground">{batch.total_leads}</strong></span>
                      <span className="text-emerald-400 font-semibold">Disponíveis: {batch.available_count}</span>
                      <span className="text-purple-400 font-semibold">Distribuídos: {batch.distributed_count}</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação: Inspecionar e Distribuir */}
                <div className="mt-4 pt-3">
                  <button
                    onClick={() => setInspectingSearchId(batch.id)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                      batch.available_count === 0
                        ? 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                        : 'bg-foreground text-background hover:opacity-90'
                    }`}
                  >
                    <Eye className={`w-4 h-4 ${batch.available_count === 0 ? 'text-purple-400' : ''}`} />
                    {batch.available_count === 0
                      ? `Inspecionar Lote (Delegado a ${batch.assigned_sellers?.[0]?.name || 'Vendedor'})`
                      : batch.distributed_count > 0
                      ? `Inspecionar & Distribuir (${batch.available_count} restantes)`
                      : 'Inspecionar Pacote & Distribuir'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal do Inspetor de Pacote */}
      {inspectingSearchId && (
        <BatchInspectorModal
          searchId={inspectingSearchId}
          onClose={() => setInspectingSearchId(null)}
          onDistributed={() => {
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
