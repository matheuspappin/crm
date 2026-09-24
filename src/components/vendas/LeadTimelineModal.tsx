'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Mail, Phone, Calendar, Clock, FileText, CheckCircle2, ChevronRight, MessageSquare, Briefcase, Pencil, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lead, Interaction } from '@/types/database'
import { useRouter } from 'next/navigation'
import { LeadFreshnessTimer } from './LeadFreshnessTimer'

interface LeadTimelineModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
}

export function LeadTimelineModal({ lead, isOpen, onClose }: LeadTimelineModalProps) {
  const [interactions, setInteractions] = useState<(Interaction & { created_by_name?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generatingContract, setGeneratingContract] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [salespeople, setSalespeople] = useState<{id: string, name: string}[]>([])
  const [assigning, setAssigning] = useState(false)
  
  const [isEditingValue, setIsEditingValue] = useState(false)
  const [editValue, setEditValue] = useState(lead.value?.toString() || '0')
  const [savingValue, setSavingValue] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchInteractions()
      fetchUserData()
    }
  }, [isOpen, lead.id])

  async function fetchUserData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRow } = await (supabase as any).from('users').select('role').eq('id', user.id).single()
      if (userRow) {
        setCurrentUserRole(userRow.role)
        if (userRow.role === 'owner') {
          const { data: sales } = await (supabase as any).from('users').select('id, name').eq('role', 'vendas').order('name')
          if (sales) setSalespeople(sales)
        }
      }
    }
  }

  async function handleAssign(userId: string) {
    if (!userId) return
    setAssigning(true)
    const { error } = await (supabase as any).from('leads').update({ assigned_to: userId }).eq('id', lead.id)
    if (!error) {
      lead.assigned_to = userId
      router.refresh()
    } else {
      alert('Erro ao atribuir: ' + error.message)
    }
    setAssigning(false)
  }

  async function fetchInteractions() {
    setLoading(true)
    const { data } = await supabase
      .from('interactions')
      .select('*, users(name)')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })

    if (data) {
      setInteractions(
        data.map((d: any) => ({
          ...d,
          created_by_name: d.users?.name,
        }))
      )
    }
    setLoading(false)
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return

    setSubmitting(true)
    const { data: userData } = await supabase.auth.getUser()
    
    if (userData.user) {
      const { data, error } = await (supabase as any)
        .from('interactions')
        .insert({
          lead_id: lead.id,
          type: 'note',
          notes: newNote,
          created_by: userData.user.id
        })
        .select('*, users(name)')
        .single()

      if (!error && data) {
        setInteractions([{ ...data, created_by_name: data.users?.name }, ...interactions])
        setNewNote('')
      }
    }
    setSubmitting(false)
  }

  async function handleGenerateContract() {
    setGeneratingContract(true)
    // Simulação da geração de contrato
    setTimeout(() => {
      alert('Contrato gerado com sucesso! (Integração com Docusign/ClickSign pendente)')
      setGeneratingContract(false)
    }, 2000)
  }

  async function handleSaveValue() {
    const numValue = Number(editValue)
    if (isNaN(numValue)) return

    setSavingValue(true)
    const { error } = await (supabase as any)
      .from('leads')
      .update({ value: numValue })
      .eq('id', lead.id)

    setSavingValue(false)
    
    if (!error) {
      setIsEditingValue(false)
      // Adicionar uma nota automática na timeline sobre a alteração de valor
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user && numValue !== lead.value) {
        const { data: noteData } = await (supabase as any)
          .from('interactions')
          .insert({
            lead_id: lead.id,
            type: 'note',
            notes: `Valor estimado alterado de ${formatCurrency(lead.value || 0)} para ${formatCurrency(numValue)}`,
            created_by: userData.user.id
          })
          .select('*, users(name)')
          .single()
        
        if (noteData) {
          setInteractions([{ ...noteData, created_by_name: noteData.users?.name }, ...interactions])
        }
      }
      
      // Update local lead object temporarily so the UI updates instantly
      lead.value = numValue
      router.refresh()
    } else {
      alert('Erro ao salvar valor: ' + error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-foreground/10 border border-border/40 flex items-center justify-center text-foreground font-bold text-xl">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
              <div className="flex items-center gap-3 text-sm mt-0.5 flex-wrap">
                {lead.contact && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {lead.contact}
                  </span>
                )}
                <LeadFreshnessTimer
                  createdAt={lead.generation_created_at || lead.created_at}
                  prefix="Gerado"
                  variant="badge"
                />
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          
          {/* Left Column - Details */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Informações do Negócio</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Valor Estimado</p>
                    {!isEditingValue && (
                      <button 
                        onClick={() => setIsEditingValue(true)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                    )}
                  </div>
                  
                  {isEditingValue ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveValue()
                            if (e.key === 'Escape') {
                              setIsEditingValue(false)
                              setEditValue(lead.value?.toString() || '0')
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleSaveValue}
                        disabled={savingValue}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        {savingValue ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingValue(false)
                          setEditValue(lead.value?.toString() || '0')
                        }}
                        disabled={savingValue}
                        className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-gradient">{formatCurrency(lead.value || 0)}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
                  <span className="badge-status bg-foreground/10 text-foreground border border-border/40 capitalize">
                    {lead.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Idade do Lead (Frescor)</p>
                  <LeadFreshnessTimer
                    createdAt={lead.generation_created_at || lead.created_at}
                    prefix="Gerado"
                    variant="detailed"
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                  {currentUserRole === 'owner' ? (
                    <select
                      value={lead.assigned_to || ''}
                      onChange={(e) => handleAssign(e.target.value)}
                      disabled={assigning}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground"
                    >
                      <option value="">Não atribuído</option>
                      {salespeople.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {lead.assigned_to ? 'Atribuído a um vendedor' : 'Não atribuído'}
                    </p>
                  )}
                </div>

                {lead.company_name && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Empresa</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-[#4b4b6a]" />
                      {lead.company_name}
                    </p>
                  </div>
                )}

                {lead.project_description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Escopo do Projeto</p>
                    <p className="text-sm text-[#e1e1e6] bg-background border border-border p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                      {lead.project_description}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Origem (UTM Source)</p>
                  <p className="text-sm font-medium text-foreground">{lead.utm_source || 'Orgânico / Direto'}</p>
                </div>

                {lead.utm_campaign && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Campanha</p>
                    <p className="text-sm font-medium text-foreground">{lead.utm_campaign}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ações Rápidas</h3>
              <button 
                onClick={handleGenerateContract}
                disabled={generatingContract}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-violet-600 hover:bg-violet-500 text-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingContract ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Gerando Contrato...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Gerar Contrato
                  </>
                )}
              </button>
              
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-secondary hover:bg-[#2a2a3e] text-foreground border border-border">
                <Mail className="w-4 h-4" />
                Enviar E-mail
              </button>
            </div>
          </div>

          {/* Right Column - Timeline */}
          <div className="w-full md:w-2/3 flex flex-col">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-foreground" />
              Linha do Tempo
            </h3>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="mb-6 relative">
              <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar uma anotação, resumo de reunião..."
                className="w-full bg-background border border-border rounded-xl pl-14 pr-4 py-3 text-sm text-foreground placeholder:text-[#4b4b6a] focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none h-24 transition-all"
              />
              <div className="absolute bottom-3 right-3">
                <button 
                  type="submit"
                  disabled={submitting || !newNote.trim()}
                  className="px-4 py-1.5 rounded-lg bg-foreground hover:opacity-90 text-background text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Nota'}
                </button>
              </div>
            </form>

            {/* Timeline Events */}
            <div className="relative pl-6 border-l-2 border-border space-y-8 pb-4 flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-border/40 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma interação registrada ainda.
                </div>
              ) : (
                interactions.map((interaction) => (
                  <div key={interaction.id} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-foreground" />
                    
                    <div className="glass-card p-4 hover:border-border transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-foreground bg-foreground/10 px-2 py-0.5 rounded-full border border-border/40">
                          {interaction.type === 'note' ? 'Anotação' : 'Status Alterado'}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(interaction.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-[#e1e1e6] whitespace-pre-wrap leading-relaxed">
                        {interaction.notes}
                      </p>
                      {interaction.created_by_name && (
                        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-[#2a2a3e] flex items-center justify-center text-[9px] font-bold text-foreground">
                            {interaction.created_by_name.charAt(0).toUpperCase()}
                          </div>
                          Registrado por {interaction.created_by_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Lead Created Event */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-[#4b4b6a]" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Lead capturado no sistema</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lead.created_at), "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
