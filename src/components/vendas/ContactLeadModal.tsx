'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types/database'
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  MapPin,
  Pencil
} from 'lucide-react'
import {
  extractCleanPhone,
  formatPhoneDisplay,
  isAddressLike,
  isEmail,
  getWhatsAppUrl,
  DEFAULT_CONTACT_SCRIPTS
} from '@/lib/contact'

interface ContactLeadModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onLeadUpdated?: (updatedLead: Lead) => void
  initialScriptId?: string
  projectUrl?: string | null
}

export function ContactLeadModal({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  initialScriptId = 'apresentacao',
  projectUrl = null,
}: ContactLeadModalProps) {
  const router = useRouter()
  const supabase = createClient()

  // Estado do contato / telefone
  const initialPhone = extractCleanPhone(lead.contact)
  const [phoneInput, setPhoneInput] = useState(
    initialPhone ? formatPhoneDisplay(initialPhone) : (isAddressLike(lead.contact) ? '' : (lead.contact || ''))
  )
  const [isEditingPhone, setIsEditingPhone] = useState(!initialPhone)
  const [savingPhone, setSavingPhone] = useState(false)

  // Vendedor logado
  const [sellerName, setSellerName] = useState('Consultor Comercial')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Script selecionado e texto da mensagem
  const [selectedScriptId, setSelectedScriptId] = useState(initialScriptId || 'apresentacao')
  const [messageText, setMessageText] = useState('')
  const [copied, setCopied] = useState(false)

  // Opções de automação
  const [recordTimeline, setRecordTimeline] = useState(true)
  const [advanceStatus, setAdvanceStatus] = useState(lead.status === 'novo')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && initialScriptId) {
      setSelectedScriptId(initialScriptId)
    }
  }, [isOpen, initialScriptId])

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: u } = await (supabase as any)
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()
        if (u?.name) setSellerName(u.name.split(' ')[0])
      }
    }
    if (isOpen) {
      loadUser()
    }
  }, [isOpen, supabase])

  // Atualizar texto da mensagem ao trocar script ou carregar dados
  useEffect(() => {
    if (!isOpen) return
    const script = DEFAULT_CONTACT_SCRIPTS.find(s => s.id === selectedScriptId) || DEFAULT_CONTACT_SCRIPTS[0]
    const firstName = lead.name ? lead.name.split(' ')[0] : 'lá'
    const company = lead.company_name || lead.name || 'sua empresa'
    const targetLink = projectUrl || 'https://...'

    const rendered = script.template
      .replace(/{nome}/gi, firstName)
      .replace(/{empresa}/gi, company)
      .replace(/{vendedor}/gi, sellerName)
      .replace(/{link}/gi, targetLink)

    setMessageText(rendered)
  }, [selectedScriptId, lead, sellerName, projectUrl, isOpen])

  if (!isOpen) return null

  const currentCleanPhone = extractCleanPhone(phoneInput)
  const hasValidPhone = Boolean(currentCleanPhone)
  const addressDetected = isAddressLike(lead.contact)
  const leadHasEmail = isEmail(lead.contact)

  // Salvar novo telefone no lead
  async function handleSavePhone() {
    const clean = extractCleanPhone(phoneInput)
    if (!clean) {
      alert('Por favor, digite um telefone válido com DDD (Ex: 51 99999-9999).')
      return
    }

    setSavingPhone(true)
    const formatted = formatPhoneDisplay(clean)
    const { error } = await (supabase as any)
      .from('leads')
      .update({ contact: formatted })
      .eq('id', lead.id)

    setSavingPhone(false)

    if (!error) {
      lead.contact = formatted
      setPhoneInput(formatted)
      setIsEditingPhone(false)
      if (onLeadUpdated) onLeadUpdated({ ...lead, contact: formatted })
    } else {
      alert('Erro ao atualizar contato: ' + error.message)
    }
  }

  // Executar abertura do WhatsApp com automações
  async function handleOpenWhatsApp() {
    let targetPhone = currentCleanPhone

    // Se estiver editando ou não tiver salvo ainda, tenta salvar
    if (!targetPhone) {
      targetPhone = extractCleanPhone(phoneInput)
      if (!targetPhone) {
        alert('Informe um número de WhatsApp válido com DDD para continuar.')
        return
      }
    }

    setSubmitting(true)

    try {
      // 1. Atualizar contato do lead no banco se necessário
      const formatted = formatPhoneDisplay(targetPhone)
      if (lead.contact !== formatted) {
        await (supabase as any)
          .from('leads')
          .update({ contact: formatted })
          .eq('id', lead.id)
        lead.contact = formatted
      }

      // 2. Registrar evento na Linha do Tempo (interação tipo 'whatsapp')
      if (recordTimeline && currentUserId) {
        await (supabase as any)
          .from('interactions')
          .insert({
            lead_id: lead.id,
            type: 'whatsapp',
            notes: `Contato via WhatsApp iniciado para ${formatted}:\n\n"${messageText}"`,
            created_by: currentUserId,
          })
      }

      // 3. Avançar status no Kanban se solicitado (de 'novo' para 'reuniao')
      let newStatus = lead.status
      if (advanceStatus && lead.status === 'novo') {
        newStatus = 'reuniao'
        await (supabase as any)
          .from('leads')
          .update({
            status: 'reuniao',
            last_moved_at: new Date().toISOString(),
          })
          .eq('id', lead.id)
        lead.status = 'reuniao'
      }

      // Atualiza o lead nos callbacks
      if (onLeadUpdated) {
        onLeadUpdated({ ...lead, contact: formatted, status: newStatus })
      }

      router.refresh()

      // 4. Abrir link oficial do WhatsApp Web / App
      const waUrl = getWhatsAppUrl(targetPhone, messageText)
      window.open(waUrl, '_blank')

      onClose()
    } catch (err: any) {
      console.error('Erro ao processar contato:', err)
      alert('Erro ao registrar contato: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopyMessage() {
    navigator.clipboard.writeText(messageText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Contactar Cliente
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  WhatsApp
                </span>
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-sm">
                {lead.name} {lead.company_name && lead.company_name !== lead.name ? `• ${lead.company_name}` : ''}
              </p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Alerta de Endereço no campo de contato (caso do lead Lancheria Sofia) */}
          {addressDetected && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-300">Endereço identificado no cadastro</p>
                <p className="text-amber-200/80 mt-0.5 line-clamp-2">{lead.contact}</p>
                <p className="text-[11px] text-amber-300/70 mt-1">
                  Insira o número de WhatsApp abaixo para contactar o cliente e atualizar este lead.
                </p>
              </div>
            </div>
          )}

          {/* Campo de Telefone / Confirmação */}
          <div className="glass-card p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Número de WhatsApp
              </label>
              {!isEditingPhone && hasValidPhone && (
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Alterar número
                </button>
              )}
            </div>

            {isEditingPhone ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="(51) 99999-9999"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePhone()
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSavePhone}
                  disabled={savingPhone || !phoneInput.trim()}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                >
                  {savingPhone ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground font-mono">
                  {formatPhoneDisplay(phoneInput)}
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="w-3 h-3" /> Válido
                </span>
              </div>
            )}
          </div>

          {/* Modelos de Mensagem (Scripts) */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Escolha um Script Comercial
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_CONTACT_SCRIPTS.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                    selectedScriptId === script.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {script.label}
                </button>
              ))}
            </div>
          </div>

          {/* Área de Edição da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mensagem a Enviar
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copiar texto
                  </>
                )}
              </button>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-emerald-500 resize-none leading-relaxed transition-colors custom-scrollbar"
              placeholder="Digite a mensagem personalizada..."
            />
          </div>

          {/* Opções de Automação */}
          <div className="space-y-2.5 pt-1 border-t border-border">
            <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordTimeline}
                onChange={(e) => setRecordTimeline(e.target.checked)}
                className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500 bg-background accent-emerald-500"
              />
              <span>Registrar este contato na <strong>Linha do Tempo</strong> do lead</span>
            </label>

            {lead.status === 'novo' && (
              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={advanceStatus}
                  onChange={(e) => setAdvanceStatus(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500 bg-background accent-emerald-500"
                />
                <span>Mover lead automaticamente de <strong>Novo Lead</strong> para <strong>Reunião</strong></span>
              </label>
            )}
          </div>
        </div>

        {/* Footer com Botões de Ação */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {leadHasEmail && (
              <a
                href={`mailto:${lead.contact}?subject=${encodeURIComponent(`Contato Comercial - ${lead.name}`)}&body=${encodeURIComponent(messageText)}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-[#2a2a3e] text-muted-foreground hover:text-foreground border border-border text-xs font-medium transition-colors"
                title="Enviar por E-mail"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-mail</span>
              </a>
            )}
            {hasValidPhone && (
              <a
                href={`tel:${currentCleanPhone}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-[#2a2a3e] text-muted-foreground hover:text-foreground border border-border text-xs font-medium transition-colors"
                title="Fazer ligação"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Ligar</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={submitting || (!hasValidPhone && !extractCleanPhone(phoneInput))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Abrindo WhatsApp...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Abrir no WhatsApp
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
