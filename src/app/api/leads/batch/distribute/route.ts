import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function inferNiche(query: string): string {
  const q = (query || '').toLowerCase()
  if (q.includes('estét') || q.includes('estet')) return 'estetica'
  if (q.includes('psic')) return 'psicologia'
  if (q.includes('odont') || q.includes('dentist')) return 'odontologia'
  if (q.includes('advog') || q.includes('jurid')) return 'advocacia'
  if (q.includes('imob') || q.includes('corretor')) return 'imobiliaria'
  if (q.includes('contab')) return 'contabilidade'
  return 'geral'
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
      search_id,
      lead_ids,
      all_available = false,
      batch_size,
      seller_id,
      destination = 'kanban', // 'kanban' | 'campaign'
      campaign_id,
    } = body

    if (!search_id || !seller_id) {
      return NextResponse.json({ error: 'search_id e seller_id são obrigatórios' }, { status: 400 })
    }

    // 1. Obter metadados do pacote
    const { data: search, error: searchError } = await db
      .from('scraped_searches')
      .select('*')
      .eq('id', search_id)
      .single()

    if (searchError || !search) {
      return NextResponse.json({ error: 'Pacote de busca não encontrado' }, { status: 404 })
    }

    // 2. Localizar os leads elegíveis
    let targetLeads: any[] = []

    if (Array.isArray(lead_ids) && lead_ids.length > 0) {
      const { data: explicitLeads, error: lErr } = await db
        .from('scraped_leads')
        .select('*')
        .eq('search_id', search_id)
        .in('id', lead_ids)

      if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })
      targetLeads = explicitLeads || []
    } else if (all_available) {
      let q = db
        .from('scraped_leads')
        .select('*')
        .eq('search_id', search_id)
        .or('distribution_status.is.null,distribution_status.eq.disponivel')
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })

      if (batch_size && Number(batch_size) > 0) {
        q = q.limit(Number(batch_size))
      }

      const { data: autoLeads, error: aErr } = await q
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
      targetLeads = autoLeads || []
    }

    if (targetLeads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead elegível para distribuição encontrado' }, { status: 400 })
    }

    const targetIds = targetLeads.map((l: any) => l.id)
    const nowIso = new Date().toISOString()
    const targetStatus = destination === 'kanban' ? 'distribuido' : 'em_campanha'

    // 3. Atualizar scraped_leads com a atribuição e status
    const { error: updateError } = await db
      .from('scraped_leads')
      .update({
        assigned_to: seller_id,
        distributed_at: nowIso,
        distribution_status: targetStatus,
      })
      .in('id', targetIds)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 4. Encaminhamento para o Destino Escolhido
    if (destination === 'kanban') {
      const niche = inferNiche(search.query)
      const crmLeadsToInsert = targetLeads.map((sl: any) => ({
        name: sl.name,
        company_name: sl.name,
        contact: sl.phone || null,
        status: 'novo',
        assigned_to: seller_id,
        scraped_lead_id: sl.id,
        generation_created_at: sl.created_at || nowIso,
        niche,
        service_type: 'ambos',
        value: 1500,
        board_order: 0,
        notes: `📦 Lote: ${search.query} (${search.city}) | Score: ${sl.score || 0} | Ausência de site: ${sl.has_website === false ? 'Sim' : 'Não verificado'}`,
      }))

      const { error: insertLeadsError } = await db
        .from('leads')
        .insert(crmLeadsToInsert)

      if (insertLeadsError) {
        console.error('Erro ao inserir leads no funil:', insertLeadsError)
        return NextResponse.json({ error: insertLeadsError.message }, { status: 500 })
      }
    } else if (destination === 'campaign' && campaign_id) {
      const dispatchesToInsert = targetLeads
        .filter((sl: any) => Boolean(sl.phone))
        .map((sl: any) => ({
          campaign_id,
          scraped_lead_id: sl.id,
          company_name: sl.name,
          phone: sl.phone,
          status: 'queued',
        }))

      if (dispatchesToInsert.length > 0) {
        const { error: insertDispatchesError } = await db
          .from('outbound_dispatches')
          .insert(dispatchesToInsert)

        if (insertDispatchesError) {
          console.error('Erro ao inserir dispatches na campanha:', insertDispatchesError)
          return NextResponse.json({ error: insertDispatchesError.message }, { status: 500 })
        }
      }
    }

    // 5. Inserir Notificação no CRM para o Vendedor
    try {
      await db.from('notifications').insert([{
        user_id: seller_id,
        title: `📦 Lote com ${targetIds.length} lead(s) recebido!`,
        message: `Você recebeu um novo lote de prospecção ("${search.query}" em ${search.city}). Contate agora antes que esfriem!`,
        type: 'info',
        link: destination === 'kanban' ? '/vendas' : '/vendas/campanhas',
        related_entity_type: destination === 'kanban' ? 'lead' : 'campaign',
      }])
    } catch (notifErr) {
      console.warn('Aviso: Falha ao emitir notificação no CRM:', notifErr)
    }

    return NextResponse.json({
      success: true,
      count: targetIds.length,
      destination,
      seller_id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
