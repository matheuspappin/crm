import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/leads/batch?search_id=...
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const db = supabase as any

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const searchId = searchParams.get('search_id')

  if (!searchId) {
    return NextResponse.json({ error: 'search_id é obrigatório' }, { status: 400 })
  }

  try {
    // 1. Metadados do Pacote / Busca
    const { data: search, error: searchError } = await db
      .from('scraped_searches')
      .select('*')
      .eq('id', searchId)
      .single()

    if (searchError || !search) {
      return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    }

    // 2. Leads do pacote com join no vendedor atribuído
    const { data: leads, error: leadsError } = await db
      .from('scraped_leads')
      .select('*, assigned_user:users!assigned_to(id, name, email, role)')
      .eq('search_id', searchId)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    // 3. Usuários vendedores disponíveis para distribuição
    const { data: sellers } = await db
      .from('users')
      .select('id, name, email, role')
      .in('role', ['vendas', 'owner'])
      .order('name', { ascending: true })

    // 4. Estatísticas do Pacote
    const allLeads = leads || []
    const total = allLeads.length
    const disponivel = allLeads.filter((l: any) => !l.distribution_status || l.distribution_status === 'disponivel').length
    const distribuido = allLeads.filter((l: any) => l.distribution_status === 'distribuido').length
    const em_campanha = allLeads.filter((l: any) => l.distribution_status === 'em_campanha').length

    return NextResponse.json({
      search,
      leads: allLeads,
      stats: { total, disponivel, distribuido, em_campanha },
      sellers: sellers || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
