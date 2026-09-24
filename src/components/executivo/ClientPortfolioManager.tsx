'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet, Building2, Sparkles, Clock, ArrowUpRight, Plus,
  CheckCircle2, AlertTriangle, TrendingUp, Repeat, Layers,
  Phone, MessageSquare, ChevronRight, Check, X, ShieldAlert,
  Calendar, Zap, RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PricingPlan {
  id: string
  product_id: string
  name: string
  setup_fee: number
  monthly_fee: number
  product?: {
    id: string
    name: string
    category: string
  }
}

interface ClientAccount {
  id: string
  name: string
  company_name: string | null
  contact: string | null
  niche: string
  value: number
  status: string
  created_at: string
  last_moved_at: string
  project?: {
    id: string
    status: string
    figma_url: string | null
    prod_url: string | null
  } | null
  subscriptions?: Array<{
    id: string
    status: string
    custom_monthly: number | null
    custom_setup_fee: number | null
    pricing_plan: {
      id: string
      name: string
      monthly_fee: number
      setup_fee: number
      product?: {
        name: string
        category: string
      }
    }
  }>
}

interface LostLead {
  id: string
  name: string
  company_name: string | null
  contact: string | null
  niche: string
  loss_reason: string | null
  created_at: string
}

interface ClientPortfolioManagerProps {
  clients: ClientAccount[]
  pricingPlans: PricingPlan[]
  lostLeads: LostLead[]
}

export function ClientPortfolioManager({
  clients,
  pricingPlans,
  lostLeads,
}: ClientPortfolioManagerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'carteira' | 'upsell' | 'reativacao'>('carteira')
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(
    clients.length > 0 ? clients[0] : null
  )

  // Modal para anexar contrato/assinatura
  const [showSubModal, setShowSubModal] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(pricingPlans[0]?.id || '')
  const [customMonthly, setCustomMonthly] = useState('')
  const [customSetup, setCustomSetup] = useState('')
  const [savingSub, setSavingSub] = useState(false)

  // Cálculo de Métricas da Carteira
  let totalMRR = 0
  let totalSetup = 0
  let atRiskCount = 0

  const now = new Date()
  clients.forEach(c => {
    // Calcula MRR
    c.subscriptions?.forEach(s => {
      if (s.status === 'active') {
        totalMRR += Number(s.custom_monthly ?? s.pricing_plan?.monthly_fee ?? 0)
        totalSetup += Number(s.custom_setup_fee ?? s.pricing_plan?.setup_fee ?? 0)
      }
    })

    // Health Score: se sem movimentação há mais de 30 dias
    const moved = new Date(c.last_moved_at || c.created_at)
    const diffDays = Math.floor((now.getTime() - moved.getTime()) / (1000 * 3600 * 24))
    if (diffDays > 30) {
      atRiskCount++
    }
  })

  // Adicionar novo contrato de recorrência
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !selectedPlanId) return

    setSavingSub(true)
    try {
      const res = await fetch('/api/clients/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedClient.id,
          pricing_plan_id: selectedPlanId,
          custom_monthly: customMonthly || null,
          custom_setup_fee: customSetup || null,
        }),
      })

      if (res.ok) {
        setShowSubModal(false)
        setCustomMonthly('')
        setCustomSetup('')
        router.refresh()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao anexar contrato')
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão')
    } finally {
      setSavingSub(false)
    }
  }

  // Preencher valores padrão ao trocar plano no modal
  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId)
    const found = pricingPlans.find(p => p.id === planId)
    if (found) {
      setCustomMonthly(String(found.monthly_fee))
      setCustomSetup(String(found.setup_fee))
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner de Métricas da Carteira */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Ativo */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">MRR da Carteira</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalMRR)}
          </p>
          <p className="text-[10px] text-muted-foreground">Receita recorrente mensal contratada</p>
        </div>

        {/* Setup Acumulado */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Setup Acumulado</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(totalSetup)}
          </p>
          <p className="text-[10px] text-muted-foreground">Receita total de taxas de implantação</p>
        </div>

        {/* Total de Contas Ativas */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Clientes na Carteira</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {clients.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Contas com contratos ativos</p>
        </div>

        {/* Saúde da Carteira */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Health Score</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {atRiskCount > 0 ? `${atRiskCount} em alerta` : '100% Saudável'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {atRiskCount > 0 ? 'Contas sem contato há mais de 30 dias' : 'Todas as contas engajadas'}
          </p>
        </div>
      </div>

      {/* Navegação Interna da Carteira */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('carteira')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'carteira'
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Contas Ativas ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('upsell')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'upsell'
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Oportunidades de Upsell
        </button>
        <button
          onClick={() => setActiveTab('reativacao')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'reativacao'
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Reativação de Base Fria ({lostLeads.length})
        </button>
      </div>

      {/* Conteúdo: Aba 1 - Contas Ativas */}
      {activeTab === 'carteira' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Contas */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {clients.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
                <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Nenhum cliente ativo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando um lead for movido para "fechado", ele aparecerá automaticamente aqui.
                </p>
              </div>
            ) : (
              clients.map((client) => {
                const isSelected = selectedClient?.id === client.id
                let clientMRR = 0
                client.subscriptions?.forEach(s => {
                  if (s.status === 'active') {
                    clientMRR += Number(s.custom_monthly ?? s.pricing_plan?.monthly_fee ?? 0)
                  }
                })

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-secondary/60 border-foreground/30 shadow-md ring-1 ring-foreground/20'
                        : 'bg-card border-border hover:border-border/80 hover:bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {client.niche}
                          </span>
                          {client.project && (
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              Projeto: {client.project.status}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-foreground">
                          {client.company_name || client.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{client.name}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90 text-foreground' : ''}`} />
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs">
                      <span className="text-muted-foreground font-mono">{client.contact}</span>
                      <span className="font-bold text-emerald-400">
                        {clientMRR > 0 ? `${formatCurrency(clientMRR)}/mês` : 'Sem MRR'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Detalhes da Conta Selecionada */}
          <div className="lg:col-span-7">
            {selectedClient ? (
              <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Nicho: {selectedClient.niche}
                    </span>
                    <h3 className="text-xl font-bold text-foreground mt-1">
                      {selectedClient.company_name || selectedClient.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Contato: {selectedClient.name} • {selectedClient.contact}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (pricingPlans.length > 0) {
                        handlePlanSelect(pricingPlans[0].id)
                      }
                      setShowSubModal(true)
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Contrato / MRR
                  </button>
                </div>

                {/* Contratos e Planos Ativos */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contratos e Serviços Recorrentes
                  </h4>

                  {(!selectedClient.subscriptions || selectedClient.subscriptions.length === 0) ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-border bg-secondary/10">
                      <Repeat className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
                      <p className="text-xs text-foreground font-medium">Nenhum contrato recorrente anexado ainda</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Clique no botão acima para vincular uma assinatura de hospedagem, tráfego ou SaaS.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.subscriptions.map((sub) => {
                        const monthly = sub.custom_monthly ?? sub.pricing_plan?.monthly_fee ?? 0
                        const setup = sub.custom_setup_fee ?? sub.pricing_plan?.setup_fee ?? 0

                        return (
                          <div
                            key={sub.id}
                            className="p-3.5 rounded-xl bg-secondary/30 border border-border flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground">
                                {sub.pricing_plan?.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {sub.pricing_plan?.product?.name} ({sub.pricing_plan?.product?.category})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-400 block">
                                {formatCurrency(monthly)} / mês
                              </span>
                              {setup > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  Setup: {formatCurrency(setup)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Status do Projeto Técnico */}
                <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status de Entrega do Projeto
                  </h4>
                  {selectedClient.project ? (
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground">Status Atual: </span>
                        <span className="text-blue-400 capitalize">{selectedClient.project.status.replace(/_/g, ' ')}</span>
                      </div>
                      {selectedClient.project.prod_url && (
                        <a
                          href={selectedClient.project.prod_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          Ver Site Ativo <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Projeto técnico em inicialização.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-card">
                <p className="text-xs text-muted-foreground">
                  Selecione um cliente à esquerda para visualizar sua carteira e contratos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo: Aba 2 - Oportunidades de Upsell Inteligentes */}
      {activeTab === 'upsell' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Matriz de Expansão de Carteira (Upsell & Cross-sell)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Gatilhos automatizados com base no tempo de relacionamento e no nicho do cliente para multiplicar o LTV.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gatilho Estética */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Nicho: Estética
              </span>
              <h4 className="text-sm font-bold text-foreground">
                Tráfego Pago & Meta Ads Local
              </h4>
              <p className="text-xs text-muted-foreground">
                Para clínicas que já possuem landing page ou site há mais de 30 dias. Oferecer gestão de anúncios focada em preenchimento de agenda.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">MRR Sugerido: R$ 1.800/m</span>
                <span className="text-[10px] text-muted-foreground">Ciclo: 30 dias</span>
              </div>
            </div>

            {/* Gatilho Psicologia */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Nicho: Psicologia
              </span>
              <h4 className="text-sm font-bold text-foreground">
                Automação de Agendamentos 24/7
              </h4>
              <p className="text-xs text-muted-foreground">
                Para consultórios particulares que perdem mensagens fora do horário de atendimento. Robô humanizado de qualificação e agendamento.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">MRR Sugerido: R$ 350/m</span>
                <span className="text-[10px] text-muted-foreground">Ciclo: 45 dias</span>
              </div>
            </div>

            {/* Gatilho Geral */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Qualquer Nicho
              </span>
              <h4 className="text-sm font-bold text-foreground">
                SEO Local & Reputação Maps
              </h4>
              <p className="text-xs text-muted-foreground">
                Otimização da ficha do Google Meu Negócio e automação de coleta de avaliações 5 estrelas para dominar o topo das buscas da cidade.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">MRR Sugerido: R$ 400/m</span>
                <span className="text-[10px] text-muted-foreground">Ciclo: 60 dias</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo: Aba 3 - Reativação de Base Fria */}
      {activeTab === 'reativacao' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              Reciclagem da Base Não-Compradora
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              80% das vendas no B2B fecham após múltiplos pontos de contato. Reative leads perdidos com ofertas de menor barreira de entrada (Tripwire).
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Leads Frios / Perdidos no Funil ({lostLeads.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Disponíveis para reativação</span>
            </div>

            {lostLeads.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs">
                Nenhum lead com status perdido no momento.
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                {lostLeads.map((lead) => (
                  <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {lead.company_name || lead.name}
                        </h4>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {lead.niche}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {lead.contact}
                      </p>
                      {lead.loss_reason && (
                        <p className="text-[10px] text-red-400 mt-1">
                          Motivo: {lead.loss_reason}
                        </p>
                      )}
                    </div>

                    <a
                      href={`/vendas/campanhas`}
                      className="px-3 py-1.5 rounded-xl bg-foreground/10 hover:bg-foreground/20 text-foreground text-xs font-semibold transition-all"
                    >
                      Criar Campanha de Retomada
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Adicionar Contrato de Recorrência */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Anexar Contrato à Carteira</h3>
                <p className="text-xs text-muted-foreground">{selectedClient?.company_name || selectedClient?.name}</p>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Selecione o Plano / Serviço:
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  {pricingPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Mensal: {formatCurrency(p.monthly_fee)} | Setup: {formatCurrency(p.setup_fee)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Mensalidade Acordada (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customMonthly}
                    onChange={(e) => setCustomMonthly(e.target.value)}
                    className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Taxa de Setup (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customSetup}
                    onChange={(e) => setCustomSetup(e.target.value)}
                    className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all"
                >
                  {savingSub ? 'Salvando...' : 'Ativar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
