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
    const {
      dispatch_id,
      reply_sentiment = 'positive',
      notes,
      create_crm_lead = true,
      initial_value = 0,
      lead_status = 'novo',
    } = body

    if (!dispatch_id) {
      return NextResponse.json({ error: 'dispatch_id é obrigatório' }, { status: 400 })
    }

    // 1. Busca os dados do disparo e da campanha
    const { data: dispatch, error: dispatchErr } = await db
      .from('outbound_dispatches')
      .select('*, campaign:outbound_campaigns(*)')
      .eq('id', dispatch_id)
      .single()

    if (dispatchErr || !dispatch) {
      return NextResponse.json({ error: 'Disparo não encontrado' }, { status: 404 })
    }

    const campaign = dispatch.campaign as any
    const niche = campaign?.niche || 'geral'

    // 2. Atualiza o disparo com status de resposta
    const nowIso = new Date().toISOString()
    const { error: updateDispatchErr } = await db
      .from('outbound_dispatches')
      .update({
        replied: true,
        replied_at: nowIso,
        reply_sentiment,
        notes: notes?.trim() || dispatch.notes,
      })
      .eq('id', dispatch_id)

    if (updateDispatchErr) {
      return NextResponse.json({ error: updateDispatchErr.message }, { status: 500 })
    }

    let createdLeadId = dispatch.lead_id

    // 3. Se for resposta positiva ou solicitado, criar o lead no pipeline do CRM
    if (create_crm_lead && (reply_sentiment === 'positive' || reply_sentiment === 'neutral')) {
      if (!createdLeadId) {
        const leadPayload: any = {
          name: dispatch.company_name || `Lead ${dispatch.phone}`,
          contact: dispatch.phone,
          company_name: dispatch.company_name,
          niche,
          scraped_lead_id: dispatch.scraped_lead_id,
          campaign_id: dispatch.campaign_id,
          status: lead_status,
          value: initial_value || 0,
          dispatched_at: dispatch.sent_at,
          replied_at: nowIso,
          reply_sentiment,
          assigned_to: authUser.id,
          notes: notes || `Lead originado do disparo da campanha "${campaign?.name || niche}".`,
        }

        const { data: newLead, error: leadError } = await db
          .from('leads')
          .insert(leadPayload)
          .select()
          .single()

        if (!leadError && newLead) {
          createdLeadId = newLead.id

          // Vincula de volta no disparo
          await db
            .from('outbound_dispatches')
            .update({ lead_id: newLead.id })
            .eq('id', dispatch_id)

          // Registra a interação inicial no CRM
          await db.from('interactions').insert({
            lead_id: newLead.id,
            type: 'whatsapp',
            notes: `Campanha Outbound (${niche}): ${notes || 'Lead respondeu positivamente ao disparo inicial.'}`,
            created_by: authUser.id,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      dispatch_id,
      lead_id: createdLeadId,
      sentiment: reply_sentiment,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
