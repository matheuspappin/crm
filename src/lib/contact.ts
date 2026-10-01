/**
 * Utilitários para tratamento, validação e formatação de contatos (WhatsApp, Telefone, E-mail)
 */

export function isAddressLike(text?: string | null): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return (
    lower.includes('rua') ||
    lower.includes('r.') ||
    lower.includes('av.') ||
    lower.includes('avenida') ||
    lower.includes('bairro') ||
    lower.includes('cep') ||
    lower.includes('porto alegre') ||
    lower.includes('santa rosa') ||
    text.includes('\n') ||
    text.includes('')
  )
}

export function isEmail(text?: string | null): boolean {
  if (!text) return false
  if (text.includes('@lid')) return false // ID interno da Meta Ads
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())
}

/**
 * Extrai um número de telefone limpo (com DDI 55) caso seja válido
 */
export function extractCleanPhone(contact?: string | null): string | null {
  if (!contact) return null
  if (isAddressLike(contact) || isEmail(contact)) return null

  // Se tiver formato tipo "@lid", ignorar
  if (contact.includes('@lid')) return null

  const digits = contact.replace(/\D/g, '')

  // Telefone celular ou fixo com DDD no Brasil (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  // Telefone já com DDI 55 (12 ou 13 dígitos)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits
  }

  return null
}

/**
 * Formata telefone para exibição amigável: (51) 98995-7317
 */
export function formatPhoneDisplay(contactOrPhone?: string | null): string {
  if (!contactOrPhone) return ''
  const digits = contactOrPhone.replace(/\D/g, '')
  const withoutCountry = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits

  if (withoutCountry.length === 11) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`
  }
  if (withoutCountry.length === 10) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 6)}-${withoutCountry.slice(6)}`
  }

  return contactOrPhone
}

/**
 * Gera URL oficial de envio do WhatsApp
 */
export function getWhatsAppUrl(fullPhone: string, message?: string): string {
  const digits = fullPhone.replace(/\D/g, '')
  const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`
  if (!message) {
    return `https://wa.me/${cleanPhone}`
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Scripts padrões para abordagem comercial dos vendedores
 */
export const DEFAULT_CONTACT_SCRIPTS: { id: string; label: string; template: string }[] = [
  {
    id: 'apresentacao',
    label: 'Apresentação Rápida',
    template: 'Olá {nome}, tudo bem? Aqui é o {vendedor} da equipe comercial da Akaai. Vi o perfil da {empresa} e identifiquei excelentes oportunidades para alavancar a atração de clientes e presença digital de vocês. Podemos conversar 5 minutinhos?',
  },
  {
    id: 'reuniao',
    label: 'Agendar Demonstração',
    template: 'Olá {nome}! Tudo bem? Gostaria de alinhar uma breve apresentação online de 10 minutos para mostrar na prática como podemos acelerar as vendas da {empresa}. Qual seria um bom horário para você hoje ou amanhã?',
  },
  {
    id: 'followup',
    label: 'Retomada / Follow-up',
    template: 'Oi {nome}, tudo bem? Imagino que a rotina na {empresa} esteja corrida! Passando só para saber se conseguiu dar uma olhada na mensagem que te enviei anteriormente? Um abraço!',
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    template: 'Olá {nome}, tudo bem?',
  },
]
