'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MonitorPlay, PenTool, ExternalLink, CheckCircle2, ChevronRight, Briefcase, Clock, AlertTriangle, Send } from 'lucide-react'
import type { Project, ProjectStatus } from '@/types/database'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Seller {
  id: string
  name: string
}

interface ProjectBoardProps {
  initialProjects: Project[]
  devs: Seller[]
  viewerRole?: 'dev' | 'vendas' | 'owner'
}

export function ProjectBoard({ initialProjects, devs, viewerRole = 'dev' }: ProjectBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reviewModalId, setReviewModalId] = useState<string | null>(null)
  const [revisionNotes, setRevisionNotes] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  useEffect(() => {
    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Formulário temporário para edição
  const [form, setForm] = useState({
    figma_url: '',
    prod_url: '',
    assigned_dev: ''
  })

  function handleEdit(project: Project) {
    setEditingId(project.id)
    setForm({
      figma_url: project.figma_url || '',
      prod_url: project.prod_url || '',
      assigned_dev: project.assigned_dev || ''
    })
  }

  async function handleSave(id: string) {
    const prevProject = projects.find(p => p.id === id)

    const { error } = await (supabase as any)
      .from('projects')
      .update({
        figma_url: form.figma_url || null,
        prod_url: form.prod_url || null,
        assigned_dev: form.assigned_dev || null
      })
      .eq('id', id)

    if (!error) {
      // Registrar alteração de link na linha do tempo do negócio se houve mudança
      if (prevProject && (prevProject.figma_url !== form.figma_url || prevProject.prod_url !== form.prod_url)) {
        let note = 'Links do projeto atualizados pelo desenvolvedor.'
        if (form.prod_url && prevProject.prod_url !== form.prod_url) {
          note += `\n🔗 Link de Teste/Produção: ${form.prod_url}`
        }
        if (form.figma_url && prevProject.figma_url !== form.figma_url) {
          note += `\n🎨 Design (Figma): ${form.figma_url}`
        }
        
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          await (supabase as any).from('interactions').insert({
            lead_id: prevProject.lead_id,
            type: 'note',
            notes: note,
            created_by: authData.user.id
          })
        }
      }

      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...form } : p))
      setEditingId(null)
      router.refresh()
    } else {
      alert('Erro ao salvar projeto: ' + error.message)
    }
  }

  async function handleStatusChange(id: string, newStatus: ProjectStatus, notes: string | null = null) {
    const updatePayload: any = { status: newStatus }
    if (notes !== null) {
      updatePayload.revision_notes = notes
    } else if (newStatus === 'aguardando_aprovacao' || newStatus === 'entregue') {
      // Clear notes when moving forward
      updatePayload.revision_notes = null
    }

    const { error } = await (supabase as any)
      .from('projects')
      .update(updatePayload)
      .eq('id', id)

    if (!error) {
      if (newStatus === 'revisao_solicitada' && notes) {
        const project = projects.find(p => p.id === id)
        if (project) {
          const { data: authData } = await supabase.auth.getUser()
          if (authData?.user) {
            await (supabase as any).from('interactions').insert({
              lead_id: project.lead_id,
              type: 'note',
              notes: `🛑 Revisão Solicitada:\n${notes}`,
              created_by: authData.user.id
            })
          }
        }
      }

      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, revision_notes: updatePayload.revision_notes } : p))
      setReviewModalId(null)
      setRevisionNotes('')
      router.refresh()
    } else {
      alert('Erro ao atualizar status do projeto: ' + error.message)
    }
  }

  const activeProjects = projects.filter(p => p.status !== 'entregue')
  const deliveredProjects = projects.filter(p => p.status === 'entregue')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Coluna 1: Em Andamento */}
      <div className="flex flex-col h-[calc(100vh-280px)]">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Em Andamento</h2>
            <span className="bg-secondary text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {activeProjects.length}
            </span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {activeProjects.map(project => (
            <div key={project.id} className={cn("bg-card border rounded-xl p-5 transition-all relative overflow-hidden", 
              project.status === 'aguardando_aprovacao' ? 'border-amber-500/30 bg-amber-500/5' :
              project.status === 'revisao_solicitada' ? 'border-pink-500/30 bg-pink-500/5' :
              'border-border hover:border-teal-500/30'
            )}>
              {/* Badge Status */}
              <div className="absolute top-4 right-4">
                {project.status === 'aguardando_aprovacao' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-500/20 text-amber-500">
                    <Clock className="w-3 h-3" /> Aguardando Cliente
                  </span>
                )}
                {project.status === 'revisao_solicitada' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-pink-500/20 text-pink-500">
                    <AlertTriangle className="w-3 h-3" /> Aguardando Dev
                  </span>
                )}
                {project.status === 'em_desenvolvimento' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-blue-500/10 text-blue-400">
                    <MonitorPlay className="w-3 h-3" /> Dev
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between mb-3 pr-28">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">{project.lead?.company_name || project.lead?.name || 'Projeto Sem Nome'}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{project.lead?.project_description || 'Sem descrição'}</span>
                  </div>
                </div>
              </div>

              {project.status === 'revisao_solicitada' && project.revision_notes && (
                <div className="mb-4 mt-2 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 text-sm">
                  <h4 className="font-semibold text-pink-400 flex items-center gap-1.5 mb-1"><AlertTriangle className="w-4 h-4"/> Notas de Revisão</h4>
                  <p className="text-pink-300/80">{project.revision_notes}</p>
                </div>
              )}

              {editingId === project.id ? (
                <div className="space-y-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Figma URL</label>
                    <input 
                      value={form.figma_url} onChange={e => setForm({...form, figma_url: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="https://figma.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">URL Produção/Homologação (Para o cliente testar)</label>
                    <input 
                      value={form.prod_url} onChange={e => setForm({...form, prod_url: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="https://dominio-do-cliente.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Dev Responsável</label>
                    <select 
                      value={form.assigned_dev} onChange={e => setForm({...form, assigned_dev: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Nenhum</option>
                      {devs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                     <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg">Cancelar</button>
                     <button onClick={() => handleSave(project.id)} className="text-xs bg-teal-600 hover:bg-teal-500 text-background px-4 py-1.5 rounded-lg transition-colors font-medium">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <PenTool className="w-4 h-4 text-pink-500" />
                    {project.figma_url ? (
                      <a href={project.figma_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
                        Design <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[#4b4b6a] italic">Figma pendente...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MonitorPlay className="w-4 h-4 text-teal-400" />
                    {project.prod_url ? (
                      <a href={project.prod_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
                        Ambiente de Teste <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[#4b4b6a] italic">Link pendente...</span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons Container */}
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    Dev: <span className="text-foreground font-medium">{project.assigned_dev_user?.name || 'Nenhum'}</span>
                  </div>
                  {!editingId && (project.status === 'em_desenvolvimento' || project.status === 'revisao_solicitada') && (
                     <button onClick={() => handleEdit(project)} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground hover:underline">
                       Editar
                     </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {viewerRole === 'dev' && (project.status === 'em_desenvolvimento' || project.status === 'revisao_solicitada') && (
                    <button 
                      onClick={() => handleStatusChange(project.id, 'aguardando_aprovacao')} 
                      className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar para Aprovação
                    </button>
                  )}

                  {viewerRole !== 'dev' && project.status === 'aguardando_aprovacao' && (
                    <>
                      <button 
                        onClick={() => setReviewModalId(project.id)} 
                        className="flex items-center gap-1.5 text-xs font-semibold border border-pink-500/20 text-pink-500 px-3 py-1.5 rounded-lg hover:bg-pink-500/10 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Solicitar Revisão
                      </button>
                      <button 
                        onClick={() => handleStatusChange(project.id, 'entregue')} 
                        className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar e Entregar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Review Modal (inline) */}
              {reviewModalId === project.id && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 p-5 flex flex-col">
                   <h3 className="text-sm font-semibold mb-2">Detalhes da Revisão</h3>
                   <textarea 
                     className="flex-1 bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-pink-500/50"
                     placeholder="O que precisa ser ajustado?"
                     value={revisionNotes}
                     onChange={e => setRevisionNotes(e.target.value)}
                   />
                   <div className="flex items-center justify-end gap-2 mt-3">
                     <button onClick={() => { setReviewModalId(null); setRevisionNotes(''); }} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Cancelar</button>
                     <button 
                       disabled={!revisionNotes.trim()}
                       onClick={() => handleStatusChange(project.id, 'revisao_solicitada', revisionNotes)} 
                       className="px-4 py-1.5 text-xs font-semibold bg-pink-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
                     >
                       Confirmar Solicitação
                     </button>
                   </div>
                </div>
              )}

            </div>
          ))}

          {activeProjects.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
               <CheckCircle2 className="w-8 h-8 text-[#4b4b6a] mb-2" />
               <p className="text-sm text-muted-foreground">Nenhum projeto pendente.</p>
             </div>
          )}
        </div>
      </div>

      {/* Coluna 2: Entregues */}
      <div className="flex flex-col h-[calc(100vh-280px)] opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Entregues (Histórico)</h2>
            <span className="bg-secondary text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {deliveredProjects.length}
            </span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          {deliveredProjects.map(project => (
            <div key={project.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {project.lead?.company_name || project.lead?.name || 'Projeto Sem Nome'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{project.lead?.project_description || 'Sem descrição'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#4b4b6a]" />
            </div>
          ))}
          
          {deliveredProjects.length === 0 && (
             <div className="text-center p-6 text-sm text-muted-foreground">
               O histórico está vazio.
             </div>
          )}
        </div>
      </div>

    </div>
  )
}
