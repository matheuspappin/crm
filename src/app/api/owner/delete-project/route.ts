import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DeleteReason, ProjectType, DeleteType } from '@/types/database'

interface DeleteProjectBody {
  projectId: string
  projectType: ProjectType
  deleteType: DeleteType
  reason: DeleteReason
  notes: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Valida sessão
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Valida que é owner
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!profile || (profile as { role: string }).role !== 'owner') {
    return NextResponse.json({ error: 'Permissão negada: apenas owner pode encerrar projetos' }, { status: 403 })
  }

  // Parse e valida body
  let body: DeleteProjectBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { projectId, projectType, deleteType, reason, notes } = body

  if (!projectId || !projectType || !deleteType || !reason || !notes?.trim()) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  if (!['dev', 'trafego'].includes(projectType)) {
    return NextResponse.json({ error: 'projectType inválido' }, { status: 400 })
  }

  if (!['soft', 'hard'].includes(deleteType)) {
    return NextResponse.json({ error: 'deleteType inválido' }, { status: 400 })
  }

  const validReasons: DeleteReason[] = [
    'cliente_cancelou', 'projeto_parado', 'inadimplencia', 'escopo_nao_aprovado', 'outro'
  ]
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: 'reason inválido' }, { status: 400 })
  }

  // Chama a função correta no Supabase
  const fnName = deleteType === 'soft'
    ? 'owner_soft_delete_project'
    : 'owner_hard_delete_project'

  const { data: auditId, error } = await (supabase as any).rpc(fnName, {
    p_project_id: projectId,
    p_project_type: projectType,
    p_reason: reason,
    p_notes: notes.trim(),
  })

  if (error) {
    console.error(`[delete-project] ${fnName} error:`, error.message)
    return NextResponse.json(
      { error: error.message || 'Erro ao encerrar projeto' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    auditId,
    deleteType,
    message: deleteType === 'soft'
      ? 'Projeto encerrado (soft-delete). Registro preservado no banco.'
      : 'Projeto excluído permanentemente. Audit log salvo.',
  })
}
