'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock, Zap, AlertTriangle, Flame, ShieldAlert } from 'lucide-react'

interface LeadFreshnessTimerProps {
  createdAt?: string | Date | null
  prefix?: string
  variant?: 'badge' | 'compact' | 'detailed'
  showIcon?: boolean
  className?: string
}

export type FreshnessLevel = 'ultra_fresh' | 'warm' | 'cold' | 'expired'

interface FreshnessInfo {
  level: FreshnessLevel
  label: string
  shortLabel: string
  sublabel: string
  badgeClass: string
  dotClass: string
  icon: any
  fullDateStr: string
}

export function computeFreshness(dateInput?: string | Date | null, prefix = 'Gerado'): FreshnessInfo {
  if (!dateInput) {
    return {
      level: 'expired',
      label: 'Data não informada',
      shortLabel: '--',
      sublabel: 'Sem registro',
      badgeClass: 'bg-secondary text-muted-foreground border-border',
      dotClass: 'bg-muted-foreground',
      icon: Clock,
      fullDateStr: '',
    }
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffMs = Math.max(0, Date.now() - date.getTime())
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  const fullDateStr = date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Formatação de tempo decorrido
  let timeStr = ''
  let shortTimeStr = ''
  if (diffMinutes < 1) {
    timeStr = 'agora mesmo'
    shortTimeStr = 'agora'
  } else if (diffMinutes < 60) {
    timeStr = `há ${diffMinutes} min`
    shortTimeStr = `${diffMinutes}m`
  } else if (diffHours < 24) {
    const remMinutes = diffMinutes % 60
    timeStr = remMinutes > 0 ? `há ${diffHours}h ${remMinutes}m` : `há ${diffHours}h`
    shortTimeStr = `${diffHours}h`
  } else {
    const remHours = diffHours % 24
    timeStr = remHours > 0 ? `há ${diffDays}d ${remHours}h` : `há ${diffDays}d`
    shortTimeStr = `${diffDays}d`
  }

  // Níveis de frescor e urgência de contato
  if (diffHours < 2) {
    return {
      level: 'ultra_fresh',
      label: `${prefix} ${timeStr}`,
      shortLabel: shortTimeStr,
      sublabel: 'Ultra Fresco • Contatar Já',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dotClass: 'bg-emerald-400 animate-pulse',
      icon: Zap,
      fullDateStr,
    }
  }

  if (diffHours < 8) {
    return {
      level: 'warm',
      label: `${prefix} ${timeStr}`,
      shortLabel: shortTimeStr,
      sublabel: 'Morno • Ideal Hoje',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dotClass: 'bg-amber-400',
      icon: Flame,
      fullDateStr,
    }
  }

  if (diffHours < 24) {
    return {
      level: 'cold',
      label: `${prefix} ${timeStr}`,
      shortLabel: shortTimeStr,
      sublabel: 'Esfriando • Priorizar',
      badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      dotClass: 'bg-orange-400',
      icon: Clock,
      fullDateStr,
    }
  }

  return {
    level: 'expired',
    label: `${prefix} ${timeStr}`,
    shortLabel: shortTimeStr,
    sublabel: 'Envelhecido • +24h',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    dotClass: 'bg-red-400',
    icon: AlertTriangle,
    fullDateStr,
  }
}

export function LeadFreshnessTimer({
  createdAt,
  prefix = 'Gerado',
  variant = 'badge',
  showIcon = true,
  className = '',
}: LeadFreshnessTimerProps) {
  // Tick a cada 60s para manter o cronômetro sincronizado sem reload
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1)
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const info = useMemo(() => computeFreshness(createdAt, prefix), [createdAt, prefix, tick])
  const Icon = info.icon

  if (variant === 'compact') {
    return (
      <span
        title={`Data de Geração: ${info.fullDateStr} (${info.sublabel})`}
        className={`inline-flex items-center gap-1 text-[11px] font-medium font-mono ${info.badgeClass.split(' ')[1]} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
        {info.shortLabel}
      </span>
    )
  }

  if (variant === 'detailed') {
    return (
      <div
        title={`Data exata de geração: ${info.fullDateStr}`}
        className={`flex items-center gap-2 p-2 rounded-xl border ${info.badgeClass} ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <Icon className="w-4 h-4" />
          {info.level === 'ultra_fresh' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>
        <div className="leading-tight">
          <div className="text-xs font-bold tracking-tight">{info.label}</div>
          <div className="text-[10px] opacity-80">{info.sublabel}</div>
        </div>
      </div>
    )
  }

  // Padrão: variant === 'badge'
  return (
    <span
      title={`Data exata: ${info.fullDateStr} • ${info.sublabel}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-medium tracking-tight whitespace-nowrap transition-colors ${info.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{info.label}</span>
    </span>
  )
}
