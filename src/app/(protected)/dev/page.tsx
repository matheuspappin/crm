import { createClient } from '@/lib/supabase/server'
import { Code2, CheckCircle2, AlertTriangle, MonitorPlay } from 'lucide-react'
import type { Project } from '@/types/database'
import { ProjectBoard } from '@/components/dev/ProjectBoard'

export default async function DevPage() {
  const supabase = await createClient()

  // Buscar projetos com os dados do lead (empresa, projeto) e dev atribuído
  const [{ data: projects }, { data: devs }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, lead:leads(*), assigned_dev_user:users!assigned_dev(name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name')
      .in('role', ['dev', 'owner'])
  ])

  const projectsData = (projects ?? []) as unknown as Project[]
  const devsData = devs ?? []

  const pendingProjects = projectsData.filter(p => p.status !== 'entregue').length
  const deliveredProjects = projectsData.filter(p => p.status === 'entregue').length
  const pixelIssues = projectsData.filter(p => p.pixel_status === 'error' || p.pixel_status === 'warning').length

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel de Engenharia</h1>
            <p className="text-xs text-muted-foreground">Gerenciamento de entregas e links de homologação</p>
          </div>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <MonitorPlay className="w-3.5 h-3.5" />
            Projetos em Andamento
          </div>
          <span className="text-2xl font-bold text-foreground">{pendingProjects}</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Projetos Entregues
          </div>
          <span className="text-2xl font-bold text-teal-400">{deliveredProjects}</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertas de Pixel
          </div>
          <span className={`text-2xl font-bold ${pixelIssues > 0 ? 'text-amber-400' : 'text-foreground'}`}>
            {pixelIssues}
          </span>
        </div>
      </div>

      {/* Projetos */}
      <ProjectBoard initialProjects={projectsData} devs={devsData} />
    </div>
  )
}
