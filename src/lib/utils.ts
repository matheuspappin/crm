import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  novo: 'Novo Lead',
  reuniao: 'Reunião',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado ✓',
  perdido: 'Perdido',
}

export const LEAD_STATUS_COLORS: Record<string, string> = {
  novo: '#6366f1',
  reuniao: '#8b5cf6',
  proposta: '#f59e0b',
  negociacao: '#f97316',
  fechado: '#10b981',
  perdido: '#6b7280',
}

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  whatsapp: '💬 WhatsApp',
  call: '📞 Ligação',
  email: '✉️ E-mail',
  note: '📝 Nota',
  meeting: '🤝 Reunião',
}

export const PIXEL_STATUS_COLORS: Record<string, string> = {
  ok: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  unknown: '#6b7280',
}
