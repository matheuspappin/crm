import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectManagementBoard } from '@/components/executivo/ProjectManagementBoard'
import { Briefcase } from 'lucide-react'

export default async function ProjetosPage() {
  const supabase = await createClient()

  // Guard: apenas owner
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!profile || (profile as { role: string }).role !== 'owner') {
    redirect('/executivo')
  }

  const [
    { data: devProjects },
    { data: trafficProjects },
    { data: deletionLogs },
  ] = await Promise.all([
    // Projetos de dev — todos (incluindo soft-deletados, owner vê tudo)
    supabase
      .from('projects')
      .select(`
        *,
        lead:leads!lead_id(name, company_name, value, service_type, contact),
        assigned_dev_user:users!projects_assigned_dev_fkey(name),
        deleted_by_user:users!deleted_by(name)
      `)
      .order('created_at', { ascending: false }),

    // Projetos de tráfego — todos
    supabase
      .from('traffic_onboarding')
      .select(`
        *,
        lead:leads!lead_id(name, company_name, value, service_type, contact),
        assigned_traffic_user:users!assigned_traffic_manager(name),
        deleted_by_user:users!deleted_by(name)
      `)
      .order('created_at', { ascending: false }),

    // Audit log das exclusões
    supabase
      .from('project_deletions')
      .select('*, deleted_by_user:users!deleted_by(name)')
      .order('deleted_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão de Projetos</h1>
          <p className="text-xs text-muted-foreground">Owner · Encerramento e auditoria de projetos</p>
        </div>
      </div>

      <ProjectManagementBoard
        devProjects={devProjects ?? []}
        trafficProjects={trafficProjects ?? []}
        deletionLogs={deletionLogs ?? []}
      />
    </div>
  )
}
