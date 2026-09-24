'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Phone, MessageSquare, Plus, CheckCircle2, AlertCircle,
  XCircle, ArrowUpRight, Flame, ExternalLink, RefreshCw,
  Sparkles, Filter, Users, ChevronRight, Check, Play, Pause,
  Clock, AlertTriangle, Zap, RotateCcw, Eye, Layers
} from 'lucide-react'
import type { OutboundCampaign, OutboundDispatch } from '@/types/database'
import { BatchInspectorModal } from './BatchInspectorModal'
import { LeadFreshnessTimer } from './LeadFreshnessTimer'

interface ScrapedSearch {
  id: string
  query: string
  city: string
  total_leads: number
  created_at: string
}

interface CampaignsManagerProps {
  initialCampaigns: OutboundCampaign[]
  searches: ScrapedSearch[]
}

const DEFAULT_SCRIPTS: Record<string, string> = {
  estetica: 'Olá! Notei o perfil da {empresa} aqui em {cidade} no Google Maps. Ajudamos clínicas de estética a lotar a agenda de procedimentos com captação direta no WhatsApp. Gostaria de ver como estruturamos esse funil?',
  psicologia: 'Olá {empresa}! Vi o seu trabalho em psicologia aqui em {cidade}. Temos um modelo validado de posicionamento e tráfego ético para consultórios que traz pacientes particulares com previsibilidade. Faz sentido conversarmos 5 minutos?',
  geral: 'Olá! Acompanho o crescimento da {empresa} aqui em {cidade}. Temos ajudado negócios do seu segmento a multiplicar o volume de clientes diários pelo Google e WhatsApp. Podemos trocar uma ideia rápida?',
}

const DEFAULT_FOLLOWUP_SCRIPTS: Record<string, string> = {
  estetica: 'Olá {nome}, tudo bem? Imagino que a rotina aí na clínica esteja bem corrida! Passando só para confirmar se conseguiu ver a mensagem anterior que enviei sobre o funil de captação de procedimentos no WhatsApp? Abraço!',
  psicologia: 'Olá {nome}! Imagino que a agenda de atendimentos esteja cheia. Só passando para saber se você conseguiu ver a mensagem anterior sobre o modelo de captação de pacientes particulares? Um abraço!',
  geral: 'Oi {nome}, tudo bem? Imagino que o dia a dia na {empresa} seja bem movimentado. Só passei para checar se conseguiu dar uma olhada na mensagem anterior que te enviei? Abraço!',
}

export function CampaignsManager({ initialCampaigns, searches }: CampaignsManagerProps) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<OutboundCampaign[]>(initialCampaigns)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    initialCampaigns.length > 0 ? initialCampaigns[0].id : null
  )
  const [dispatches, setDispatches] = useState<OutboundDispatch[]>([])
  const [loadingDispatches, setLoadingDispatches] = useState(false)
  const [filterSentiment, setFilterSentiment] = useState<string>('all')
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Modal de Criação de Campanha
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [campName, setCampName] = useState('')
  const [campNiche, setCampNiche] = useState('estetica')
  const [campCity, setCampCity] = useState('')
  const [selectedSearchId, setSelectedSearchId] = useState<string>('')
  const [campScript, setCampScript] = useState(DEFAULT_SCRIPTS['estetica'])
  const [campFollowupScript, setCampFollowupScript] = useState(DEFAULT_FOLLOWUP_SCRIPTS['estetica'])
  const [campTimeoutHours, setCampTimeoutHours] = useState('24')
  const [inspectingSearchId, setInspectingSearchId] = useState<string | null>(null)

  // Modal / Ação de Resposta Rápida
  const [replyModalDispatch, setReplyModalDispatch] = useState<OutboundDispatch | null>(null)
  const [replySentiment, setReplySentiment] = useState<'positive' | 'neutral' | 'objection' | 'opt_out'>('positive')
  const [replyNotes, setReplyNotes] = useState('')
  const [initialValue, setInitialValue] = useState('1500')
  const [submittingReply, setSubmittingReply] = useState(false)

  // Carregar dispatches da campanha selecionada
  const fetchDispatches = async (campaignId: string) => {
    setLoadingDispatches(true)
    try {
      const res = await fetch(`/api/campaigns/dispatches?campaign_id=${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setDispatches(data.dispatches || [])
      }
    } catch (e) {
      console.error('Erro ao buscar disparos:', e)
    } finally {
      setLoadingDispatches(false)
    }
  }

  // Ao mudar de campanha
  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id)
    fetchDispatches(id)
  }

  // Alternar Status: Pausar / Retomar Campanha
  const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    setTogglingStatus(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao alterar status da campanha')
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão')
    } finally {
      setTogglingStatus(false)
    }
  }

  // Registrar Envio de Retomada Anti-Vácuo
  const handleMarkFollowup = async (dispatchId: string) => {
    try {
      const res = await fetch('/api/campaigns/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          mark_followup: true,
          dispatch_id: dispatchId,
        }),
      })
      if (res.ok) {
        setDispatches(prev => prev.map(d => d.id === dispatchId ? {
          ...d,
          followup_sent: true,
          followup_sent_at: new Date().toISOString()
        } : d))
      }
    } catch (e) {
      console.error('Erro ao marcar retomada:', e)
    }
  }

  // Registrar Expirado / Vácuo Definitivo
  const handleMarkExpired = async (dispatchId: string) => {
    if (!confirm('Deseja marcar este lead como expirado (vácuo definitivo)?')) return
    try {
      const res = await fetch('/api/campaigns/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          mark_expired: true,
          dispatch_id: dispatchId,
        }),
      })
      if (res.ok) {
        setDispatches(prev => prev.map(d => d.id === dispatchId ? {
          ...d,
          is_expired: true,
          expired_at: new Date().toISOString()
        } : d))
      }
    } catch (e) {
      console.error('Erro ao expirar disparo:', e)
    }
  }

  // Preencher template ao trocar nicho
  const handleNicheChange = (niche: string) => {
    setCampNiche(niche)
    setCampScript(DEFAULT_SCRIPTS[niche] || DEFAULT_SCRIPTS['geral'])
    setCampFollowupScript(DEFAULT_FOLLOWUP_SCRIPTS[niche] || DEFAULT_FOLLOWUP_SCRIPTS['geral'])
  }

  // Preencher dados ao escolher uma busca do Lead Hunter
  const handleSearchSelect = (searchId: string) => {
    setSelectedSearchId(searchId)
    const found = searches.find(s => s.id === searchId)
    if (found) {
      setCampName(`Campanha: ${found.query} em ${found.city}`)
      setCampCity(found.city)
      const q = found.query.toLowerCase()
      if (q.includes('estét') || q.includes('estet')) {
        handleNicheChange('estetica')
      } else if (q.includes('psic')) {
        handleNicheChange('psicologia')
      } else {
        handleNicheChange(q.split(' ')[0])
      }
    }
  }

  // Salvar nova campanha
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campName.trim() || !campNiche.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campName.trim(),
          niche: campNiche.trim(),
          city: campCity.trim(),
          target_script: campScript.trim(),
          followup_script: campFollowupScript.trim(),
          timeout_hours: parseInt(campTimeoutHours) || 24,
          scrapedSearchId: selectedSearchId || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.campaign) {
          setCampaigns([data.campaign, ...campaigns])
          setSelectedCampaignId(data.campaign.id)
          setShowCreateModal(false)
          fetchDispatches(data.campaign.id)
          router.refresh()
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao criar campanha')
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão')
    } finally {
      setCreating(false)
    }
  }

  // Registrar resposta rápida
  const handleSaveReply = async () => {
    if (!replyModalDispatch) return

    setSubmittingReply(true)
    try {
      const res = await fetch('/api/campaigns/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_id: replyModalDispatch.id,
          reply_sentiment: replySentiment,
          notes: replyNotes,
          create_crm_lead: replySentiment === 'positive' || replySentiment === 'neutral',
          initial_value: parseFloat(initialValue) || 0,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        // Atualiza estado local
        setDispatches(prev => prev.map(d => {
          if (d.id === replyModalDispatch.id) {
            return {
              ...d,
              replied: true,
              replied_at: new Date().toISOString(),
              reply_sentiment: replySentiment,
              notes: replyNotes,
              lead_id: result.lead_id || d.lead_id,
            }
          }
          return d
        }))

        // Atualiza contagem na campanha
        setCampaigns(prev => prev.map(c => {
          if (c.id === selectedCampaignId) {
            return { ...c, total_replies: c.total_replies + 1 }
          }
          return c
        }))

        setReplyModalDispatch(null)
        setReplyNotes('')
        router.refresh()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao registrar resposta')
      }
    } catch (e: any) {
      alert(e.message || 'Erro de conexão')
    } finally {
      setSubmittingReply(false)
    }
  }

  // Gerar link do WhatsApp com script inicial
  const getWhatsAppLink = (dispatch: OutboundDispatch, scriptTemplate?: string | null) => {
    const cleanPhone = (dispatch.phone || '').replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
    const primeiroNome = dispatch.company_name ? dispatch.company_name.split(' ')[0] : 'lá'

    let text = scriptTemplate || activeCampaign?.target_script || 'Olá! Gostaria de conversar sobre uma oportunidade para o seu negócio.'
    text = text
      .replace(/{empresa}/gi, dispatch.company_name || 'sua empresa')
      .replace(/{nome}/gi, primeiroNome)
      .replace(/{cidade}/gi, activeCampaign?.city || 'sua região')

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
  }

  // Gerar link do WhatsApp com script de retomada anti-vácuo
  const getFollowupWhatsAppLink = (dispatch: OutboundDispatch, scriptTemplate?: string | null) => {
    const cleanPhone = (dispatch.phone || '').replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
    const primeiroNome = dispatch.company_name ? dispatch.company_name.split(' ')[0] : 'lá'

    let text = scriptTemplate || activeCampaign?.followup_script || DEFAULT_FOLLOWUP_SCRIPTS[activeCampaign?.niche || 'geral'] || DEFAULT_FOLLOWUP_SCRIPTS['geral']
    text = text
      .replace(/{empresa}/gi, dispatch.company_name || 'sua empresa')
      .replace(/{nome}/gi, primeiroNome)
      .replace(/{cidade}/gi, activeCampaign?.city || 'sua região')

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
  }

  const activeCampaign = campaigns.find(c => c.id === selectedCampaignId)
  const timeoutHours = activeCampaign?.timeout_hours || 24

  // Métricas de vácuo e resposta para a campanha selecionada
  const dueFollowupCount = dispatches.filter(d => {
    if (d.replied || d.followup_sent || d.is_expired) return false
    const elapsed = (Date.now() - new Date(d.sent_at).getTime()) / (1000 * 60 * 60)
    return elapsed >= timeoutHours
  }).length

  const followupSentCount = dispatches.filter(d => d.followup_sent && !d.replied && !d.is_expired).length
  const positiveCount = dispatches.filter(d => d.replied && d.reply_sentiment === 'positive').length
  const expiredCount = dispatches.filter(d => d.is_expired).length
  const pendingCount = dispatches.filter(d => {
    if (d.replied || d.followup_sent || d.is_expired) return false
    const elapsed = (Date.now() - new Date(d.sent_at).getTime()) / (1000 * 60 * 60)
    return elapsed < timeoutHours
  }).length

  // Filtrar dispatches
  const filteredDispatches = dispatches.filter(d => {
    const elapsed = (Date.now() - new Date(d.sent_at).getTime()) / (1000 * 60 * 60)
    const isDue = !d.replied && !d.followup_sent && !d.is_expired && elapsed >= timeoutHours

    if (filterSentiment === 'all') return true
    if (filterSentiment === 'due_followup') return isDue
    if (filterSentiment === 'followup_sent') return d.followup_sent && !d.replied && !d.is_expired
    if (filterSentiment === 'positive') return d.replied && d.reply_sentiment === 'positive'
    if (filterSentiment === 'pending') return !d.replied && !d.followup_sent && !d.is_expired && elapsed < timeoutHours
    if (filterSentiment === 'expired') return d.is_expired
    if (filterSentiment === 'replied') return d.replied
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Banner de Inteligência */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-card to-secondary/30 border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Máquina Outbound Ativa
            </span>
            <span className="text-xs text-muted-foreground">• Disparos por Nicho com Régua Anti-Vácuo</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">Campanhas de Prospecção & Retomada</h2>
          <p className="text-xs text-muted-foreground">
            Dispare o primeiro contato e resgate quem não respondeu com a Mensagem de Retomada Anti-Vácuo antes de expirar.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Grid: Lista de Campanhas (Esquerda) + Fila de Disparos (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Painel Esquerdo: Lista de Campanhas */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" /> Suas Campanhas ({campaigns.length})
            </h3>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <Send className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Nenhuma campanha criada</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Importe os leads raspados do Lead Hunter para criar sua primeira campanha.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/20 font-medium"
              >
                + Criar Primeira Campanha
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {campaigns.map((camp) => {
                const isSelected = camp.id === selectedCampaignId
                const replyRate = camp.total_dispatches > 0
                  ? ((camp.total_replies / camp.total_dispatches) * 100).toFixed(1)
                  : '0'
                const isPaused = camp.status === 'paused'

                return (
                  <div
                    key={camp.id}
                    onClick={() => handleSelectCampaign(camp.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-secondary/60 border-foreground/30 shadow-md ring-1 ring-foreground/20'
                        : 'bg-card border-border hover:border-border/80 hover:bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {camp.niche}
                          </span>
                          {isPaused ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                              <Pause className="w-2.5 h-2.5 fill-amber-400" /> Pausada
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-emerald-400" /> Ativa
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1">
                          {camp.name}
                        </h4>
                        {camp.city && (
                          <p className="text-xs text-muted-foreground">{camp.city}</p>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90 text-foreground' : ''}`} />
                    </div>

                    {/* Mini Métricas da Campanha */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Disparos</span>
                        <span className="text-xs font-bold text-foreground">{camp.total_dispatches}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Respostas</span>
                        <span className="text-xs font-bold text-emerald-400">{camp.total_replies}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Taxa Resp.</span>
                        <span className="text-xs font-bold text-amber-400">{replyRate}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Painel Direito: Fila de Disparos da Campanha Selecionada */}
        <div className="lg:col-span-8">
          {activeCampaign ? (
            <div className="space-y-4">
              {/* Header da Campanha Ativa com Botão de Pausar/Retomar */}
              <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                      Nicho: {activeCampaign.niche}
                    </span>
                    {activeCampaign.status === 'paused' ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Pause className="w-3 h-3 fill-amber-400" /> Pausada
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Play className="w-3 h-3 fill-emerald-400" /> Ativa
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Limite Anti-Vácuo: {activeCampaign.timeout_hours || 24}h
                    </span>
                    {activeCampaign.city && (
                      <span className="text-xs text-muted-foreground">📍 {activeCampaign.city}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{activeCampaign.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                    "{activeCampaign.target_script || 'Sem roteiro padrão cadastrado'}"
                  </p>
                </div>

                {/* Botão de Controle de Campanha (Pausar / Retomar) */}
                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  <button
                    onClick={() => handleToggleCampaignStatus(activeCampaign.id, activeCampaign.status)}
                    disabled={togglingStatus}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                      activeCampaign.status === 'paused'
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {activeCampaign.status === 'paused' ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-black" /> Retomar Campanha
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-amber-400" /> Pausar Campanha
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Alerta de Retomada Anti-Vácuo */}
              {dueFollowupCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-start sm:items-center gap-2.5 text-amber-300">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="block text-foreground font-semibold">
                        {dueFollowupCount} lead(s) no vácuo há mais de {activeCampaign.timeout_hours || 24}h!
                      </strong>
                      <span className="text-muted-foreground text-[11px]">
                        Dispare a Mensagem de Retomada (Anti-Vácuo) para reengajar esses contatos antes que expirem.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setFilterSentiment('due_followup')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" /> Ver Fila Anti-Vácuo ({dueFollowupCount})
                  </button>
                </div>
              )}

              {/* Barra de Filtros de Disparos */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl border border-border text-xs flex-wrap">
                  <button
                    onClick={() => setFilterSentiment('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterSentiment === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Todos ({dispatches.length})
                  </button>
                  <button
                    onClick={() => setFilterSentiment('due_followup')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      filterSentiment === 'due_followup'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : dueFollowupCount > 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Zap className="w-3 h-3" /> Anti-Vácuo ({dueFollowupCount})
                  </button>
                  <button
                    onClick={() => setFilterSentiment('followup_sent')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterSentiment === 'followup_sent' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Retomada Enviada ({followupSentCount})
                  </button>
                  <button
                    onClick={() => setFilterSentiment('positive')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterSentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Interessados ({positiveCount})
                  </button>
                  <button
                    onClick={() => setFilterSentiment('pending')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterSentiment === 'pending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Aguardando ({pendingCount})
                  </button>
                  <button
                    onClick={() => setFilterSentiment('expired')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${filterSentiment === 'expired' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Expirados ({expiredCount})
                  </button>
                </div>
              </div>

              {/* Tabela de Disparos */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-3 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    Leads na Campanha ({filteredDispatches.length})
                  </span>
                  <button
                    onClick={() => fetchDispatches(activeCampaign.id)}
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDispatches ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingDispatches ? (
                  <div className="p-12 text-center text-muted-foreground text-xs">
                    Carregando leads da campanha...
                  </div>
                ) : filteredDispatches.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-xs">
                    Nenhum lead encontrado com esse filtro.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                    {filteredDispatches.map((dispatch) => {
                      const waLink = getWhatsAppLink(dispatch, activeCampaign.target_script)
                      const waFollowupLink = getFollowupWhatsAppLink(dispatch, activeCampaign.followup_script)
                      const elapsedHours = (Date.now() - new Date(dispatch.sent_at).getTime()) / (1000 * 60 * 60)
                      const isDueFollowup = !dispatch.replied && !dispatch.followup_sent && !dispatch.is_expired && elapsedHours >= timeoutHours

                      return (
                        <div
                          key={dispatch.id}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            isDueFollowup
                              ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500'
                              : 'hover:bg-secondary/20'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-foreground">
                                {dispatch.company_name || 'Nome não identificado'}
                              </h4>
                              {dispatch.replied ? (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  dispatch.reply_sentiment === 'positive'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : dispatch.reply_sentiment === 'objection'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  <Check className="w-3 h-3" /> Respondeu ({dispatch.reply_sentiment || 'neutro'})
                                </span>
                              ) : dispatch.is_expired ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Expirado (Vácuo)
                                </span>
                              ) : dispatch.followup_sent ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                  <RotateCcw className="w-3 h-3" /> Retomada Enviada
                                </span>
                              ) : isDueFollowup ? (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> No Vácuo ({Math.floor(elapsedHours)}h sem falar)
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Aguardando ({Math.floor(elapsedHours)}h de {timeoutHours}h)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3" /> {dispatch.phone}
                              </span>
                              {dispatch.lead_id && (
                                <span className="text-[10px] text-emerald-400 font-medium">
                                  ✓ Lead no Funil Comercial
                                </span>
                              )}
                              {dispatch.followup_sent_at && (
                                <span className="text-[10px] text-purple-300">
                                  Retomada em {new Date(dispatch.followup_sent_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              {dispatch.notes && (
                                <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                                  Obs: {dispatch.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ações Rápidas */}
                          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                            {isDueFollowup ? (
                              <a
                                href={waFollowupLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => handleMarkFollowup(dispatch.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold transition-all shadow-sm"
                                title="Abre o WhatsApp com a mensagem de retomada anti-vácuo"
                              >
                                <Zap className="w-3.5 h-3.5" /> Enviar Anti-Vácuo
                              </a>
                            ) : dispatch.followup_sent && !dispatch.replied && !dispatch.is_expired ? (
                              <>
                                <a
                                  href={waFollowupLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all"
                                  title="Reenviar mensagem de retomada"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Reenviar
                                </a>
                                <button
                                  onClick={() => handleMarkExpired(dispatch.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
                                  title="Marcar como perdido por vácuo definitivo"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Expirar
                                </button>
                              </>
                            ) : (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Abrir WhatsApp
                              </a>
                            )}

                            <button
                              onClick={() => {
                                setReplyModalDispatch(dispatch)
                                setReplySentiment('positive')
                                setReplyNotes('')
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-foreground/10 hover:bg-foreground/20 text-foreground text-xs font-semibold transition-all border border-border"
                            >
                              Registrar Retorno
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-card">
              <p className="text-sm text-muted-foreground">
                Selecione uma campanha à esquerda para visualizar e disparar os leads.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Criar Campanha a partir de Busca do Lead Hunter */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Nova Campanha Outbound por Nicho</h3>
                <p className="text-xs text-muted-foreground">Importe buscas do Lead Hunter e defina a copy da máquina de vendas</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              {/* Selecionar busca existente */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Vincular Busca do Lead Hunter / Aquecedor:
                  </label>
                  {selectedSearchId && (
                    <button
                      type="button"
                      onClick={() => setInspectingSearchId(selectedSearchId)}
                      className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver o que tem no pacote
                    </button>
                  )}
                </div>
                <select
                  value={selectedSearchId}
                  onChange={(e) => handleSearchSelect(e.target.value)}
                  className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="">-- Nenhuma busca (Criar em branco) --</option>
                  {searches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.query} em {s.city} ({s.total_leads} leads raspados)
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome e Nicho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Nome da Campanha:</label>
                  <input
                    type="text"
                    required
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    placeholder="Ex: Clínicas Estética POA - Outbound Q1"
                    className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Nicho / Segmento:</label>
                  <select
                    value={campNiche}
                    onChange={(e) => handleNicheChange(e.target.value)}
                    className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  >
                    <option value="estetica">Clínica de Estética</option>
                    <option value="psicologia">Psicólogo(a)</option>
                    <option value="odontologia">Odontologia</option>
                    <option value="advocacia">Advocacia</option>
                    <option value="geral">Geral / Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Cidade / Região:</label>
                <input
                  type="text"
                  value={campCity}
                  onChange={(e) => setCampCity(e.target.value)}
                  placeholder="Ex: Porto Alegre"
                  className="w-full text-xs bg-secondary/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Roteiro / Copy do Disparo Inicial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    1. Roteiro do Primeiro Contato (com tags dinâmicas):
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Variáveis: {'{empresa}'}, {'{nome}'}, {'{cidade}'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={campScript}
                  onChange={(e) => setCampScript(e.target.value)}
                  className="w-full text-xs bg-secondary/40 border border-border rounded-xl p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Régua Anti-Vácuo: Tempo Limite e Mensagem de Retomada */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> 2. Régua de Retomada (Anti-Vácuo)
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <span className="text-[11px] text-muted-foreground">Limite sem resposta:</span>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={campTimeoutHours}
                      onChange={(e) => setCampTimeoutHours(e.target.value)}
                      className="w-16 text-center text-xs bg-card border border-border rounded-lg px-2 py-1 font-bold text-foreground focus:outline-none"
                    />
                    <span className="text-xs font-semibold">horas</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Mensagem de Retomada (disparada se o lead ficar no vácuo):
                    </label>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      Variáveis: {'{nome}'}, {'{empresa}'}, {'{cidade}'}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={campFollowupScript}
                    onChange={(e) => setCampFollowupScript(e.target.value)}
                    className="w-full text-xs bg-card border border-border rounded-xl p-2.5 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all flex items-center gap-1.5"
                >
                  {creating ? 'Criando Campanha...' : 'Criar & Importar Fila'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Retorno e Enviar para Funil Comercial */}
      {replyModalDispatch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Registrar Retorno do Lead</h3>
                <p className="text-xs text-muted-foreground">{replyModalDispatch.company_name} ({replyModalDispatch.phone})</p>
              </div>
              <button
                onClick={() => setReplyModalDispatch(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Como foi a resposta?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReplySentiment('positive')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      replySentiment === 'positive'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    🟢 Interessado / Agendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplySentiment('objection')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      replySentiment === 'objection'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    🟡 Objeção / Dúvida
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplySentiment('neutral')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      replySentiment === 'neutral'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    🔵 Pediu retorno futuro
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplySentiment('opt_out')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      replySentiment === 'opt_out'
                        ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    🔴 Sem interesse / Sair
                  </button>
                </div>
              </div>

              {replySentiment === 'positive' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Este lead será adicionado ao Kanban Comercial automaticamente!
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Estimativa de Contrato Inicial (R$):
                    </label>
                    <input
                      type="number"
                      value={initialValue}
                      onChange={(e) => setInitialValue(e.target.value)}
                      placeholder="1500"
                      className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notas sobre a resposta ou objeção:
                </label>
                <textarea
                  rows={3}
                  value={replyNotes}
                  onChange={(e) => setReplyNotes(e.target.value)}
                  placeholder="Ex: Pediu para ligar às 14h / achou o preço interessante..."
                  className="w-full text-xs bg-secondary/40 border border-border rounded-xl p-2.5 text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setReplyModalDispatch(null)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingReply}
                onClick={handleSaveReply}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all"
              >
                {submittingReply ? 'Salvando...' : 'Confirmar Retorno'}
              </button>
            </div>
          </div>
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
