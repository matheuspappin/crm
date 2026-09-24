import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    // 1. Dados do funil por nicho (da view SQL)
    const { data: nicheFunnel, error: nicheErr } = await supabase
      .from('vw_niche_funnel_analytics')
      .select('*')
      .order('total_won_revenue', { ascending: false })

    if (nicheErr) {
      return NextResponse.json({ error: nicheErr.message }, { status: 500 })
    }

    // 2. Campanhas mais recentes e ativas
    const { data: campaigns } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // 3. Comparativo de fechamento: com website vs sem website (da base raspada)
    const { data: siteStats } = await supabase.rpc('get_scraped_conversion_stats').maybeSingle()

    return NextResponse.json({
      nicheFunnel: nicheFunnel || [],
      campaigns: campaigns || [],
      siteStats: siteStats || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
