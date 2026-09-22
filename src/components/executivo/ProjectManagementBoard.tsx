'use client'

import { useState } from 'react'
import type { Project, TrafficOnboarding, ProjectDeletion, DeleteReason } from '@/types/database'
import { DeleteProjectModal } from './DeleteProjectModal'
import {
  Code2, BarChart3, Trash2, EyeOff, Eye, Clock,
  CheckCircle2, AlertTriangle, Shield, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type ProjectWithLead = Project & {
  lead?: { name: string; company_name: string | null; value: number; service_type: string; contact: string | null } | null
  assigned_dev_user?: { name: string } | null
  deleted_by_user?: { name: string } | null
}

type TrafficWithLead = TrafficOnboarding & {
  lead?: { name: string; company_name: string | null; value: number; service_type: string; contact: string | null } | null
  assigned_traffic_user?: { name: string } | null
  deleted_by_user?: { name: string } | null
}

type DeletionWithUser = ProjectDeletion & {
  deleted_by_user?: { name: string } | null
}

interface ProjectManagementBoardProps {
  devProjects: ProjectWithLead[]
  trafficProjects: TrafficWithLead[]
  deletionLogs: DeletionWithUser[]
}

const reasonLabels: Record<DeleteReason, string> = {
  cliente_cancelou: 'Cliente cancelou',
  projeto_parado: 'Projeto parado',
  inadimplencia: 'Inadimplência',
  escopo_nao_aprovado: 'Escopo não aprovado',
  outro: 'Outro motivo',
}

type Tab = 'dev' | 'trafego' | 'audit'

export function ProjectManagementBoard({ devProjects, trafficProjects, deletionLogs }: ProjectManagementBoardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dev')
  const [showDeleted, setShowDeleted] = useState(false)
  const [modalProject, setModalProject] = useState<{
    id: string; type: 'dev' | 'trafego'; clientName: string; clientValue: number; assignedTo: string | null
  } | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  function openModal(p: ProjectWithLead | TrafficWithLead, type: 'dev' | 'trafego') {
    setModalProject({
      id: p.id,
      type,
      clientName: p.lead?.name ?? 'Cliente',
      clientValue: p.lead?.value ?? 0,
      assignedTo: type === 'dev'
        ? (p as ProjectWithLead).assigned_dev_user?.name ?? null
        : (p as TrafficWithLead).assigned_traffic_user?.name ?? null,
    })
  }

  function handleDeleteSuccess(auditId: string, deleteType: 'soft' | 'hard') {
    if (modalProject) {
      // Marca como soft-deleted localmente (otimista)
      if (deleteType === 'soft') {
        setDeletedIds((prev) => new Set([...prev, modalProject.id]))
      }
      setModalProject(null)
    }
  }

  const activeDevProjects = devProjects.filter((p) => !p.deleted_at && !deletedIds.has(p.id))
  const deletedDevProjects = devProjects.filter((p) => p.deleted_at || deletedIds.has(p.id))
  const activeTrafficProjects = trafficProjects.filter((p) => !p.deleted_at && !deletedIds.has(p.id))
  const deletedTrafficProjects = trafficProjects.filter((p) => p.deleted_at || deletedIds.has(p.id))

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    {
      key: 'dev',
      label: 'Engenharia',
      icon: <Code2 className="w-4 h-4" />,
      count: activeDevProjects.length,
      color: 'text-emerald-400',
    },
    {
      key: 'trafego',
      label: 'Tráfego',
      icon: <BarChart3 className="w-4 h-4" />,
      count: activeTrafficProjects.length,
      color: 'text-violet-400',
    },
    {
      key: 'audit',
      label: 'Audit Log',
      icon: <Shield className="w-4 h-4" />,
      count: deletionLogs.length,
      color: 'text-amber-400',
    },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Dev Ativos', v: activeDevProjects.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Tráfego Ativos', v: activeTrafficProjects.length, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Encerrados (Soft)', v: deletedDevProjects.length + deletedTrafficProjects.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Hard-deleted', v: deletionLogs.filter(d => d.delete_type === 'hard').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map((k) => (
          <div key={k.label} className={`glass-card border ${k.bg} p-4`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.v}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === t.key
                ? `border-current ${t.color}`
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {t.icon}
            {t.label}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              activeTab === t.key ? 'bg-current/10' : 'bg-secondary text-muted-foreground'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Tab: DEV ─── */}
      {activeTab === 'dev' && (
        <ProjectTable
          projects={activeDevProjects}
          type="dev"
          onDelete={openModal}
          emptyMessage="Nenhum projeto de dev ativo"
        />
      )}

      {activeTab === 'dev' && deletedDevProjects.length > 0 && (
        <div>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {showDeleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <EyeOff className="w-3.5 h-3.5" />
            {showDeleted ? 'Ocultar' : 'Ver'} projetos encerrados ({deletedDevProjects.length})
          </button>
          {showDeleted && (
            <ProjectTable
              projects={deletedDevProjects}
              type="dev"
              onDelete={openModal}
              isDeleted
              emptyMessage=""
            />
          )}
        </div>
      )}

      {/* ─── Tab: TRÁFEGO ─── */}
      {activeTab === 'trafego' && (
        <TrafficTable
          projects={activeTrafficProjects}
          onDelete={openModal}
          emptyMessage="Nenhum projeto de tráfego ativo"
        />
      )}

      {activeTab === 'trafego' && deletedTrafficProjects.length > 0 && (
        <div>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {showDeleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <EyeOff className="w-3.5 h-3.5" />
            {showDeleted ? 'Ocultar' : 'Ver'} projetos encerrados ({deletedTrafficProjects.length})
          </button>
          {showDeleted && (
            <TrafficTable
              projects={deletedTrafficProjects}
              onDelete={openModal}
              isDeleted
              emptyMessage=""
            />
          )}
        </div>
      )}

      {/* ─── Tab: AUDIT LOG ─── */}
      {activeTab === 'audit' && (
        <AuditTable logs={deletionLogs} />
      )}

      {/* Modal */}
      {modalProject && (
        <DeleteProjectModal
          project={modalProject}
          onClose={() => setModalProject(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}

// ─── Sub-componente: tabela de projetos dev ───
function ProjectTable({
  projects, type, onDelete, isDeleted = false, emptyMessage
}: {
  projects: ProjectWithLead[]
  type: 'dev'
  onDelete: (p: ProjectWithLead, t: 'dev') => void
  isDeleted?: boolean
  emptyMessage: string
}) {
  if (projects.length === 0 && emptyMessage) {
    return (
      <div className="glass-card border border-border rounded-2xl p-10 text-center">
        <Code2 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('glass-card border rounded-2xl overflow-hidden', isDeleted ? 'border-border/40 opacity-75' : 'border-border')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/50">
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dev Responsável</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Criado em</th>
            {!isDeleted && <th className="px-4 py-3" />}
            {isDeleted && <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Encerrado por</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p) => (
            <tr key={p.id} className={cn('transition-colors', !isDeleted && 'hover:bg-card/40')}>
              <td className="px-4 py-3">
                <p className="text-xs font-medium text-foreground">{p.lead?.name ?? '—'}</p>
                {p.lead?.company_name && <p className="text-[10px] text-muted-foreground">{p.lead.company_name}</p>}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">{p.assigned_dev_user?.name ?? '—'}</span>
              </td>
              <td className="px-4 py-3">
                {isDeleted ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    <EyeOff className="w-3 h-3" /> Encerrado
                  </span>
                ) : p.status === 'entregue' ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Entregue
                  </span>
                ) : p.status === 'aguardando_aprovacao' ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> Aguard. Aprovação
                  </span>
                ) : p.status === 'revisao_solicitada' ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <AlertTriangle className="w-3 h-3" /> Revisão
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Code2 className="w-3 h-3" /> Em progresso
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-xs font-semibold text-emerald-400">{formatCurrency(p.lead?.value ?? 0)}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                </span>
              </td>
              {!isDeleted && (
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(p, 'dev')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Encerrar
                  </button>
                </td>
              )}
              {isDeleted && (
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {p.deleted_by_user?.name ?? '—'}
                    {p.deleted_at && (
                      <span className="block text-[10px]">
                        {format(new Date(p.deleted_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Sub-componente: tabela de projetos tráfego ───
function TrafficTable({
  projects, onDelete, isDeleted = false, emptyMessage
}: {
  projects: TrafficWithLead[]
  onDelete: (p: TrafficWithLead, t: 'trafego') => void
  isDeleted?: boolean
  emptyMessage: string
}) {
  if (projects.length === 0 && emptyMessage) {
    return (
      <div className="glass-card border border-border rounded-2xl p-10 text-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('glass-card border rounded-2xl overflow-hidden', isDeleted ? 'border-border/40 opacity-75' : 'border-border')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/50">
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gestor de Tráfego</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Budget/dia</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Criado em</th>
            {!isDeleted && <th className="px-4 py-3" />}
            {isDeleted && <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Encerrado por</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p) => (
            <tr key={p.id} className={cn('transition-colors', !isDeleted && 'hover:bg-card/40')}>
              <td className="px-4 py-3">
                <p className="text-xs font-medium text-foreground">{p.lead?.name ?? '—'}</p>
                {p.lead?.company_name && <p className="text-[10px] text-muted-foreground">{p.lead.company_name}</p>}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">{p.assigned_traffic_user?.name ?? '—'}</span>
              </td>
              <td className="px-4 py-3">
                {isDeleted ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    <EyeOff className="w-3 h-3" /> Encerrado
                  </span>
                ) : p.is_active ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                    <AlertTriangle className="w-3 h-3" /> Inativo
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-xs font-semibold text-violet-400">
                  {p.daily_budget != null ? formatCurrency(p.daily_budget) + '/dia' : '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                </span>
              </td>
              {!isDeleted && (
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(p, 'trafego')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Encerrar
                  </button>
                </td>
              )}
              {isDeleted && (
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {p.deleted_by_user?.name ?? '—'}
                    {p.deleted_at && (
                      <span className="block text-[10px]">
                        {format(new Date(p.deleted_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Sub-componente: audit log ───
function AuditTable({ logs }: { logs: DeletionWithUser[] }) {
  if (logs.length === 0) {
    return (
      <div className="glass-card border border-border rounded-2xl p-10 text-center">
        <Shield className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum projeto foi encerrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="glass-card border border-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/50">
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Motivo</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operação</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Executado por</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-card/40 transition-colors">
              <td className="px-4 py-3">
                <p className="text-xs font-medium text-foreground">{log.lead_name}</p>
                {log.lead_value != null && (
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(log.lead_value)}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                  log.project_type === 'dev'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                )}>
                  {log.project_type === 'dev' ? 'Dev' : 'Tráfego'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">{reasonLabels[log.reason]}</span>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                  log.delete_type === 'soft'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                )}>
                  {log.delete_type === 'soft' ? <EyeOff className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                  {log.delete_type === 'soft' ? 'Soft' : 'Hard'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-foreground">{log.deleted_by_user?.name ?? '—'}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.deleted_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
