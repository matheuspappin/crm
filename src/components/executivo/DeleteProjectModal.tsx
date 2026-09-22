'use client'

import { useState } from 'react'
import type { DeleteReason, ProjectType } from '@/types/database'
import {
  AlertTriangle, X, Trash2, EyeOff, CheckSquare, Square,
  Shield, Loader2, CheckCircle2, Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface DeleteProjectModalProps {
  project: {
    id: string
    type: ProjectType
    clientName: string
    clientValue: number
    assignedTo: string | null
  }
  onClose: () => void
  onSuccess: (auditId: string, deleteType: 'soft' | 'hard') => void
}

const reasonOptions: { value: DeleteReason; label: string; desc: string }[] = [
  { value: 'cliente_cancelou',     label: 'Cliente cancelou',        desc: 'O cliente solicitou o cancelamento do contrato' },
  { value: 'projeto_parado',       label: 'Projeto parado',          desc: 'O projeto ficou sem andamento por inatividade' },
  { value: 'inadimplencia',        label: 'Inadimplência',           desc: 'O cliente não realizou os pagamentos acordados' },
  { value: 'escopo_nao_aprovado',  label: 'Escopo não aprovado',     desc: 'Proposta técnica/comercial não foi aprovada' },
  { value: 'outro',                label: 'Outro motivo',            desc: 'Descreva o motivo na observação abaixo' },
]

type Step = 'form' | 'confirm_soft' | 'confirm_hard' | 'success'

export function DeleteProjectModal({ project, onClose, onSuccess }: DeleteProjectModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft')
  const [reason, setReason] = useState<DeleteReason | ''>('')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [hardConfirmText, setHardConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auditId, setAuditId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const canProceed =
    reason !== '' &&
    notes.trim().length >= 20 &&
    !loading

  async function handleSubmit() {
    if (step === 'form') {
      setStep(deleteType === 'soft' ? 'confirm_soft' : 'confirm_hard')
      return
    }

    if (!confirmed) return
    if (deleteType === 'hard' && hardConfirmText !== project.clientName) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/owner/delete-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectType: project.type,
          deleteType,
          reason,
          notes: notes.trim(),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Erro inesperado')
        setLoading(false)
        return
      }

      setAuditId(json.auditId)
      setStep('success')
      onSuccess(json.auditId, deleteType)
    } catch (e) {
      setError('Falha de comunicação com o servidor')
    } finally {
      setLoading(false)
    }
  }

  function copyAuditId() {
    if (!auditId) return
    navigator.clipboard.writeText(auditId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const projectTypeLabel = project.type === 'dev' ? 'Engenharia (Dev)' : 'Tráfego'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === 'success' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-[#0d0d14] border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-5 py-4 border-b border-border rounded-t-2xl',
          step === 'success' ? 'bg-emerald-500/5' : deleteType === 'hard' ? 'bg-red-500/5' : 'bg-amber-500/5'
        )}>
          <div className="flex items-center gap-2.5">
            {step === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : deleteType === 'hard' ? (
              <Trash2 className="w-5 h-5 text-red-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {step === 'success' ? 'Projeto Encerrado' : 'Encerrar Projeto'}
              </h2>
              <p className="text-[11px] text-muted-foreground">{projectTypeLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ─── STEP: FORM ─── */}
          {step === 'form' && (
            <>
              {/* Preview do cliente */}
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Projeto a encerrar</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{project.clientName}</p>
                    {project.assignedTo && (
                      <p className="text-xs text-muted-foreground">Responsável: {project.assignedTo}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(project.clientValue)}</p>
                </div>
              </div>

              {/* Tipo de exclusão */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Tipo de encerramento</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDeleteType('soft')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      deleteType === 'soft'
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-border hover:border-border/80 bg-card'
                    )}
                  >
                    <EyeOff className={cn('w-4 h-4 mb-1.5', deleteType === 'soft' ? 'text-amber-400' : 'text-muted-foreground')} />
                    <p className="text-xs font-semibold text-foreground">Soft-delete</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Oculta o projeto. Dados preservados para auditoria.</p>
                  </button>
                  <button
                    onClick={() => setDeleteType('hard')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      deleteType === 'hard'
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-border hover:border-border/80 bg-card'
                    )}
                  >
                    <Trash2 className={cn('w-4 h-4 mb-1.5', deleteType === 'hard' ? 'text-red-400' : 'text-muted-foreground')} />
                    <p className="text-xs font-semibold text-foreground">Hard-delete</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Remove permanentemente. <span className="text-red-400">Sem volta.</span></p>
                  </button>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Motivo <span className="text-red-400">*</span></p>
                <div className="space-y-1.5">
                  {reasonOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setReason(opt.value)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all',
                        reason === opt.value
                          ? 'border-foreground/30 bg-foreground/5'
                          : 'border-border hover:border-border/80 bg-card'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                        reason === opt.value ? 'border-foreground bg-foreground' : 'border-border'
                      )}>
                        {reason === opt.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-background" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observação */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">
                  Observação detalhada <span className="text-red-400">*</span>
                  <span className="text-muted-foreground font-normal ml-1">(mín. 20 caracteres)</span>
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva em detalhes o motivo do encerramento para fins de documentação..."
                  rows={3}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors resize-none"
                />
                <p className={cn(
                  'text-[10px] mt-1 text-right',
                  notes.length < 20 ? 'text-muted-foreground' : 'text-emerald-400'
                )}>
                  {notes.length} / 20+
                </p>
              </div>
            </>
          )}

          {/* ─── STEP: CONFIRM SOFT ─── */}
          {step === 'confirm_soft' && (
            <>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-400">Confirmação de Soft-Delete</p>
                </div>
                <p className="text-xs text-muted-foreground">O projeto de <strong className="text-foreground">{project.clientName}</strong> será <strong className="text-amber-400">ocultado</strong> dos painéis de Dev e Tráfego.</p>
                <p className="text-xs text-muted-foreground">O registro permanece no banco de dados e pode ser auditado pelo owner a qualquer momento.</p>
              </div>

              <div className="rounded-xl bg-card border border-border p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resumo da operação</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Motivo:</span>
                  <span className="text-foreground font-medium">{reasonOptions.find(r => r.value === reason)?.label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="text-amber-400 font-medium">Soft-delete (reversível)</span>
                </div>
              </div>

              <button
                onClick={() => setConfirmed(!confirmed)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:border-border/80 bg-card transition-colors text-left"
              >
                {confirmed
                  ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                }
                <p className="text-xs text-muted-foreground">
                  Confirmo que li as informações acima e quero encerrar este projeto.
                  Um audit log será gerado com meu nome e horário.
                </p>
              </button>
            </>
          )}

          {/* ─── STEP: CONFIRM HARD ─── */}
          {step === 'confirm_hard' && (
            <>
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <p className="text-xs font-bold text-red-400">ATENÇÃO: EXCLUSÃO PERMANENTE</p>
                </div>
                <p className="text-xs text-muted-foreground">Esta ação irá <strong className="text-red-400">remover permanentemente</strong> o projeto do banco de dados. Esta operação <strong className="text-red-400">não pode ser desfeita</strong>.</p>
                <p className="text-xs text-muted-foreground">Um registro de auditoria será preservado na tabela <code className="text-[10px] bg-red-500/10 px-1 rounded">project_deletions</code> como comprovante.</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">
                  Para confirmar, digite o nome do cliente: <span className="text-red-400">{project.clientName}</span>
                </p>
                <input
                  type="text"
                  value={hardConfirmText}
                  onChange={(e) => setHardConfirmText(e.target.value)}
                  placeholder={project.clientName}
                  className="w-full bg-card border border-red-500/30 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/60 transition-colors"
                />
                {hardConfirmText && hardConfirmText !== project.clientName && (
                  <p className="text-[10px] text-red-400 mt-1">Nome não confere</p>
                )}
              </div>

              <button
                onClick={() => setConfirmed(!confirmed)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-red-500/20 hover:border-red-500/40 bg-card transition-colors text-left"
              >
                {confirmed
                  ? <CheckSquare className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  : <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                }
                <p className="text-xs text-muted-foreground">
                  Entendo que esta ação é <strong className="text-red-400">irreversível</strong> e confirmo a exclusão permanente deste projeto.
                </p>
              </button>
            </>
          )}

          {/* ─── STEP: SUCCESS ─── */}
          {step === 'success' && auditId && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Projeto encerrado com sucesso</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {deleteType === 'soft'
                      ? 'O projeto foi ocultado dos painéis operacionais.'
                      : 'O projeto foi removido permanentemente do banco de dados.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-3.5 h-3.5 text-foreground/50" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comprovante de Auditoria</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID do Audit Log:</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
                    <code className="text-[11px] text-foreground/80 flex-1 break-all">{auditId}</code>
                    <button
                      onClick={copyAuditId}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copiar ID"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className={deleteType === 'soft' ? 'text-amber-400' : 'text-red-400'}>
                      {deleteType === 'soft' ? 'Soft-delete' : 'Hard-delete'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Motivo:</span>
                    <span className="text-foreground">{reasonOptions.find(r => r.value === reason)?.label}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3">
          {step !== 'success' && (
            <>
              <button
                onClick={() => {
                  if (step === 'form') onClose()
                  else { setStep('form'); setConfirmed(false); setHardConfirmText('') }
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-all"
              >
                {step === 'form' ? 'Cancelar' : 'Voltar'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={
                  !canProceed ||
                  (step !== 'form' && !confirmed) ||
                  (step === 'confirm_hard' && hardConfirmText !== project.clientName) ||
                  loading
                }
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2',
                  deleteType === 'hard' && step !== 'form'
                    ? 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/30 disabled:text-white/50'
                    : 'bg-foreground hover:bg-foreground/90 text-background disabled:bg-foreground/20 disabled:text-foreground/30',
                  'disabled:cursor-not-allowed'
                )}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {step === 'form'
                  ? 'Continuar →'
                  : loading
                    ? 'Processando...'
                    : deleteType === 'hard'
                      ? '⚠ Excluir Permanentemente'
                      : 'Confirmar Encerramento'
                }
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background text-xs font-semibold transition-all"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
