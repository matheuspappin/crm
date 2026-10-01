'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types/database'
import {
  X,
  Trash2,
  Archive,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronDown
} from 'lucide-react'

interface DiscardLeadModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updatedLead: Lead) => void
  onLeadDeleted?: (leadId: string) => void
}

const COMMON_REASONS = [
  'Sem interesse / Perfil incompatível',
  'Não respondeu / Vácuo definitivo',
  'Sem orçamento / Preço alto',
  'Optou por concorrente',
  'Contato / Número inválido',
  'Outro motivo',
]

export function DiscardLeadModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
  onLeadDeleted,
}: DiscardLeadModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0])
  const [customNotes, setCustomNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false)
  const [hardDeleting, setHardDeleting] = useState(false)

  if (!isOpen) return null

  // 1. Mover lead para Perdidos / Lixeira (Soft-delete com preservação de auditoria)
  async function handleDiscard() {
    setSubmitting(true)
    try {
      const finalReason = selectedReason === 'Outro motivo'
        ? (customNotes.trim() || 'Outro motivo não especificado')
        : customNotes.trim()
          ? `${selectedReason}: ${customNotes.trim()}`
          : selectedReason

      const now = new Date().toISOString()

      // Obter usuário logado para atribuir auditoria
      const { data: { user } } = await supabase.auth.getUser()

      // Registrar interação na timeline do lead
      if (user) {
        await (supabase as any).from('interactions').insert({
          lead_id: lead.id,
          type: 'note',
          notes: `❌ Lead marcado como Perdido / Descartado. Motivo: ${finalReason}`,
          created_by: user.id,
        })
      }

      // Atualizar status para 'perdido' e registrar o loss_reason
      const { error } = await (supabase as any)
        .from('leads')
        .update({
          status: 'perdido',
          loss_reason: finalReason,
          last_moved_at: now,
        })
        .eq('id', lead.id)

      if (error) {
        throw error
      }

      const updatedLead: Lead = {
        ...lead,
        status: 'perdido',
        loss_reason: finalReason,
        last_moved_at: now,
      }

      if (onSuccess) {
        onSuccess(updatedLead)
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      console.error('Erro ao descartar lead:', err)
      alert('Erro ao descartar lead: ' + (err.message || 'Falha na conexão'))
    } finally {
      setSubmitting(false)
    }
  }

  // 2. Exclusão permanente do banco de dados (Hard delete definitivo)
  async function handleHardDelete() {
    setHardDeleting(true)
    try {
      const { error } = await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', lead.id)

      if (error) {
        throw error
      }

      if (onLeadDeleted) {
        onLeadDeleted(lead.id)
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      console.error('Erro ao excluir definitivamente o lead:', err)
      alert('Erro ao excluir definitivamente: ' + (err.message || 'Falha na conexão'))
    } finally {
      setHardDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {showHardDeleteConfirm ? 'Excluir Lead Definitivamente' : 'Descartar Lead do Funil'}
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                {lead.name} {lead.company_name ? `· ${lead.company_name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {!showHardDeleteConfirm ? (
            <>
              {/* Card Explicativo: Onde o lead vai */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <Archive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-semibold text-amber-400 block mb-0.5">Encaminhamento para a Lixeira / Perdidos</span>
                  Este lead sairá do seu Funil Kanban ativo e será arquivado na aba <span className="font-semibold text-foreground">Clientes & Perdidos</span>. Ele não será deletado do histórico e poderá ser reativado a qualquer momento.
                </div>
              </div>

              {/* Seleção de Motivo */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Motivo do Descarte / Insucesso:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMMON_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setSelectedReason(reason)}
                        className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-500/15 border-red-500/40 text-red-300 font-semibold shadow-sm'
                            : 'bg-background hover:bg-secondary/60 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="truncate pr-1">{reason}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detalhes Opcionais */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">
                  Detalhes adicionais ou resumo da objeção (opcional):
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: Cliente disse que já fechou contrato semestral com outra agência, tentar retorno em 6 meses..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-red-500/50 resize-none h-20 transition-all"
                />
              </div>

              {/* Opção para exclusão definitiva */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowHardDeleteConfirm(true)}
                  className="text-[11px] text-muted-foreground/60 hover:text-red-400 hover:underline transition-colors flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Deseja excluir permanentemente do banco?
                </button>
              </div>
            </>
          ) : (
            /* Modo Confirmação de Hard Delete */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-xs leading-relaxed space-y-2">
                <p className="font-semibold text-red-400 flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  Atenção: Ação Irreversível!
                </p>
                <p className="text-red-200/90">
                  Esta opção removerá <strong className="text-white">{lead.name}</strong>, suas anotações, histórico de interações e dados comerciais <strong>permanentemente do sistema</strong>.
                </p>
                <p className="text-red-300/70 text-[11px]">
                  Recomendamos usar o descarte padrão para que os dados de tráfego (UTMs) e motivos fiquem registrados nas métricas de conversão.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHardDeleteConfirm(false)}
                className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"
              >
                Voltar para o descarte padrão (recomendado)
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-card/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || hardDeleting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>

          {!showHardDeleteConfirm ? (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {submitting ? 'Descartando...' : 'Mover para Perdidos / Lixeira'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleHardDelete}
              disabled={hardDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {hardDeleting ? 'Excluindo definitivamente...' : 'Sim, Excluir Definitivamente'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
