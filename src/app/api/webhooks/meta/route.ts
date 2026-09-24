import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ============================================================
// Supabase service client (sem cookies — server-side puro)
// ============================================================
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ============================================================
// Valida a assinatura HMAC do Meta Ads
// Ref: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
// ============================================================
function validateMetaSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.META_WEBHOOK_SECRET) return false

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )
}

// ============================================================
// Extrai dados do payload do Meta Lead Ads
// O Meta envia um array de changes → cada um tem um leadgen_id
// ============================================================
interface MetaLeadEntry {
  id: string
  time: number
  changes: Array<{
    value: {
      ad_id: string
      ad_name: string
      adset_name: string
      campaign_id: string
      campaign_name: string
      form_id: string
      leadgen_id: string
      created_time: number
      page_id: string
      page_name: string
    }
    field: string
  }>
}

interface MetaWebhookPayload {
  object: string
  entry: MetaLeadEntry[]
}

// ============================================================
// Busca dados reais do Lead (Nome, Telefone, Email) via Graph API
// ============================================================
async function fetchLeadFromGraphAPI(leadgenId: string) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    console.warn('[Meta Webhook] META_ACCESS_TOKEN não configurado. Impossível buscar dados do lead.')
    return null
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`)
    if (!res.ok) {
      console.error('[Meta Webhook] Erro na Graph API:', await res.text())
      return null
    }
    const data = await res.json()
    
    let name = ''
    let email = ''
    let phone = ''

    if (data.field_data) {
      for (const field of data.field_data) {
        if (field.name === 'full_name' && field.values.length > 0) name = field.values[0]
        if (field.name === 'first_name' && field.values.length > 0) name = field.values[0] + (name ? ' ' + name : '')
        if (field.name === 'last_name' && field.values.length > 0) name = (name ? name + ' ' : '') + field.values[0]
        if (field.name === 'email' && field.values.length > 0) email = field.values[0]
        if (field.name === 'phone_number' && field.values.length > 0) phone = field.values[0]
      }
    }
    
    return { name: name.trim(), email, phone }
  } catch (err) {
    console.error('[Meta Webhook] Erro ao buscar dados na Graph API:', err)
    return null
  }
}

// ============================================================
// GET — Verificação do webhook (Meta Webhook Handshake)
// O Meta faz um GET com hub.challenge para validar a URL
// ============================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Meta Webhook] ✓ Verificação bem-sucedida')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
}

// ============================================================
// POST — Recebe eventos de lead do Meta Lead Ads
// ============================================================
export async function POST(request: NextRequest) {
  const supabase = getSupabase()

  // Lê o corpo raw para validação da assinatura
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  // Valida assinatura HMAC (pula em dev se o secret não estiver configurado)
  if (process.env.NODE_ENV === 'production' && !validateMetaSignature(rawBody, signature)) {
    await supabase.rpc('insert_system_log', {
      p_event: 'webhook_error',
      p_payload: { reason: 'invalid_signature', signature },
      p_status: 403,
      p_source: 'meta_webhook',
    })
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 403 })
  }

  let payload: MetaWebhookPayload

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // Verifica se é evento de leadgen do Meta
  if (payload.object !== 'page') {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Processa cada entry do payload
  const results = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const cv = change.value
      
      // Monta o lead com os dados disponíveis do webhook
      // Busca dados reais na Graph API se o token estiver configurado
      let leadName = `Lead Meta #${cv.leadgen_id.slice(-6)}`
      let leadContact = null
      
      const graphData = await fetchLeadFromGraphAPI(cv.leadgen_id)
      let additionalNotes = {}
      
      if (graphData) {
        if (graphData.name) leadName = graphData.name
        
        // Combina telefone e email no campo contact, ou usa apenas o que estiver disponível
        const contactParts = []
        if (graphData.phone) contactParts.push(graphData.phone)
        if (graphData.email) contactParts.push(graphData.email)
        
        if (contactParts.length > 0) {
          leadContact = contactParts.join(' - ')
        }
        
        if (graphData.email) additionalNotes = { ...additionalNotes, email: graphData.email }
        if (graphData.phone) additionalNotes = { ...additionalNotes, phone: graphData.phone }
      }

      const leadData = {
        name: leadName,
        contact: leadContact,
        status: 'novo' as const,
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: cv.campaign_name ?? cv.campaign_id,
        utm_content: cv.ad_name ?? cv.ad_id,
        notes: JSON.stringify({
          ...additionalNotes,
          leadgen_id: cv.leadgen_id,
          form_id: cv.form_id,
          page_id: cv.page_id,
          page_name: cv.page_name,
          adset_name: cv.adset_name,
          campaign_id: cv.campaign_id,
        }),
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single()

      if (error) {
        console.error('[Meta Webhook] Erro ao inserir lead:', error)
        await supabase.rpc('insert_system_log', {
          p_event: 'webhook_error',
          p_payload: { leadgen_id: cv.leadgen_id, error: error.message },
          p_status: 500,
          p_error_msg: error.message,
          p_source: 'meta_webhook',
        })
        results.push({ leadgen_id: cv.leadgen_id, success: false, error: error.message })
        continue
      }

      // Log de sucesso
      await supabase.rpc('insert_system_log', {
        p_event: 'webhook_received',
        p_payload: {
          lead_id: lead.id,
          leadgen_id: cv.leadgen_id,
          campaign: cv.campaign_name,
          ad: cv.ad_name,
        },
        p_status: 200,
        p_source: 'meta_webhook',
      })

      results.push({ leadgen_id: cv.leadgen_id, lead_id: lead.id, success: true })
    }
  }

  // O Meta exige resposta 200 rápida — caso contrário, reenvia o evento
  return NextResponse.json({ received: true, processed: results.length, results }, { status: 200 })
}
