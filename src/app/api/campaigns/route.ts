import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const db = supabase as any

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const niche = searchParams.get('niche')

  let query = db
    .from('outbound_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (niche) {
    query = query.eq('niche', niche)
  }

  const { data: campaigns, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ campaigns })
}

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
      name,
      niche,
      city,
      channel = 'whatsapp',
      target_script,
      followup_script,
      timeout_hours = 24,
      scrapedSearchId,
    } = body

    if (!name || !niche) {
      return NextResponse.json({ error: 'Nome e nicho são obrigatórios' }, { status: 400 })
    }

    // 1. Cria a campanha
    const { data: campaign, error: campaignError } = await db
      .from('outbound_campaigns')
      .insert({
        name,
        niche: niche.toLowerCase().trim(),
        city: city?.trim() || null,
        channel,
        target_script: target_script?.trim() || null,
        followup_script: followup_script?.trim() || null,
        timeout_hours: Number(timeout_hours) || 24,
        status: 'active',
        created_by: authUser.id,
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: campaignError?.message || 'Erro ao criar campanha' }, { status: 500 })
    }

    // 2. Se foi vinculada uma busca raspada (Lead Hunter), importar os leads para dispatches
    let importedCount = 0
    if (scrapedSearchId) {
      const { data: scrapedLeads } = await db
        .from('scraped_leads')
        .select('*')
        .eq('search_id', scrapedSearchId)
        .not('phone', 'is', null)

      if (scrapedLeads && scrapedLeads.length > 0) {
        const dispatchesToInsert = scrapedLeads.map((sl: any) => ({
          campaign_id: campaign.id,
          scraped_lead_id: sl.id,
          company_name: sl.name,
          phone: sl.phone,
          status: 'queued',
        }))

        const { error: dispatchError } = await db
          .from('outbound_dispatches')
          .insert(dispatchesToInsert)

        if (!dispatchError) {
          importedCount = scrapedLeads.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign,
      importedCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const db = supabase as any

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, status, timeout_hours, followup_script, target_script, name } = body

    if (!id) {
      return NextResponse.json({ error: 'id da campanha é obrigatório' }, { status: 400 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      }
      updates.status = status
    }
    if (timeout_hours !== undefined) updates.timeout_hours = Number(timeout_hours)
    if (followup_script !== undefined) updates.followup_script = followup_script
    if (target_script !== undefined) updates.target_script = target_script
    if (name !== undefined) updates.name = name

    const { data: campaign, error } = await db
      .from('outbound_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
