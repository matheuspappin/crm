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
    const { campaign_id, dispatches, dispatch_ids, mark_all_sent } = body

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 })
    }

    // Caso 1: Marcar existentes como 'sent'
    if (mark_all_sent) {
      const { data, error } = await db
        .from('outbound_dispatches')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('campaign_id', campaign_id)
        .eq('status', 'queued')
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: data?.length ?? 0 })
    }

    // Caso: Marcar envio de Mensagem Anti-Vácuo (Follow-up)
    if (body.mark_followup) {
      const ids = dispatch_ids || (body.dispatch_id ? [body.dispatch_id] : [])
      if (ids.length === 0) {
        return NextResponse.json({ error: 'dispatch_ids ou dispatch_id é obrigatório' }, { status: 400 })
      }

      const { data, error } = await db
        .from('outbound_dispatches')
        .update({
          followup_sent: true,
          followup_sent_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: data?.length ?? 0, dispatches: data })
    }

    // Caso: Marcar como Expirado / Perdido por Vácuo
    if (body.mark_expired) {
      const ids = dispatch_ids || (body.dispatch_id ? [body.dispatch_id] : [])
      if (ids.length === 0) {
        return NextResponse.json({ error: 'dispatch_ids ou dispatch_id é obrigatório' }, { status: 400 })
      }

      const { data, error } = await db
        .from('outbound_dispatches')
        .update({
          is_expired: true,
          expired_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: data?.length ?? 0, dispatches: data })
    }

    if (dispatch_ids && Array.isArray(dispatch_ids)) {
      const { data, error } = await db
        .from('outbound_dispatches')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', dispatch_ids)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: data?.length ?? 0 })
    }

    // Caso 2: Inserir novos disparos avulsos
    if (dispatches && Array.isArray(dispatches) && dispatches.length > 0) {
      const formatted = dispatches.map((d: any) => ({
        campaign_id,
        scraped_lead_id: d.scraped_lead_id || null,
        company_name: d.company_name || null,
        phone: d.phone,
        status: d.status || 'sent',
        sent_at: new Date().toISOString(),
        notes: d.notes || null,
      }))

      const { data, error } = await db
        .from('outbound_dispatches')
        .insert(formatted)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, inserted: data?.length ?? 0 })
    }

    return NextResponse.json({ error: 'Nenhuma ação especificada' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
