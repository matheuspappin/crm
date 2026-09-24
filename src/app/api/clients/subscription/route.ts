import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const db = supabase as any

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { lead_id, pricing_plan_id, custom_monthly, custom_setup_fee } = body

    if (!lead_id || !pricing_plan_id) {
      return NextResponse.json({ error: 'lead_id e pricing_plan_id são obrigatórios' }, { status: 400 })
    }

    const { data: sub, error } = await db
      .from('lead_subscriptions')
      .insert({
        lead_id,
        pricing_plan_id,
        custom_monthly: custom_monthly ? parseFloat(custom_monthly) : null,
        custom_setup_fee: custom_setup_fee ? parseFloat(custom_setup_fee) : null,
        status: 'active',
        created_by: authUser.id,
      })
      .select('*, pricing_plan:pricing_plans(*, product:products(*))')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Registra interação no histórico do lead
    await db.from('interactions').insert({
      lead_id,
      type: 'note',
      notes: `Novo contrato de recorrência/serviço ativado na carteira: Plano ${(sub as any)?.pricing_plan?.name || ''} (MRR: R$ ${custom_monthly || (sub as any)?.pricing_plan?.monthly_fee || 0})`,
      created_by: authUser.id,
    })

    return NextResponse.json({ success: true, subscription: sub })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
