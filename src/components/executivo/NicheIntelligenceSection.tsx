'use client'

import { useState, useEffect } from 'react'
import {
  Trophy, TrendingUp, Flame, Globe, Globe2, Target,
  DollarSign, ArrowUpRight, BarChart2, ShieldCheck, Sparkles
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { NicheFunnelAnalytics } from '@/types/database'

interface NicheIntelligenceSectionProps {
  initialNiches: NicheFunnelAnalytics[]
  siteStats?: {
    total_with_website: number
    total_without_website: number
    won_with_website: number
    won_without_website: number
  } | null
}

export function NicheIntelligenceSection({ initialNiches, siteStats }: NicheIntelligenceSectionProps) {
  const [niches, setNiches] = useState<NicheFunnelAnalytics[]>(initialNiches)

  // Encontra os vencedores
  const sortedByRevenue = [...niches].sort((a, b) => (b.total_won_revenue || 0) - (a.total_won_revenue || 0))
  const topRevenueNiche = sortedByRevenue[0]

  const sortedByReply = [...niches].sort((a, b) => (b.reply_rate_pct || 0) - (a.reply_rate_pct || 0))
  const topReplyNiche = sortedByReply.find(n => n.total_dispatched > 0) || sortedByReply[0]

  const sortedByClose = [...niches].sort((a, b) => (b.close_rate_pct || 0) - (a.close_rate_pct || 0))
  const topCloseNiche = sortedByClose.find(n => n.total_leads_entered > 0) || sortedByClose[0]

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Inteligência de Nichos & ICP Vencedor</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Preditivo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Mapeamento de quem mais responde, quem mais fecha e onde está o maior faturamento
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Destaque / ICP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nicho Campeão de Receita */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Maior Faturamento
          </span>
          <p className="text-lg font-bold text-foreground capitalize">
            {topRevenueNiche?.niche || '—'}
          </p>
          <p className="text-xs font-semibold text-emerald-400">
            {formatCurrency(topRevenueNiche?.total_won_revenue || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {topRevenueNiche?.total_won || 0} contratos fechados
          </p>
        </div>

        {/* Nicho Mais Engajado */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Maior Taxa de Resposta
          </span>
          <p className="text-lg font-bold text-foreground capitalize">
            {topReplyNiche?.niche || '—'}
          </p>
          <p className="text-xs font-semibold text-amber-400">
            {topReplyNiche?.reply_rate_pct || 0}% de respostas
          </p>
          <p className="text-[10px] text-muted-foreground">
            {topReplyNiche?.total_replied || 0} de {topReplyNiche?.total_dispatched || 0} disparos
          </p>
        </div>

        {/* Maior Fechamento */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-violet-400" /> Maior Conversão (Close)
          </span>
          <p className="text-lg font-bold text-foreground capitalize">
            {topCloseNiche?.niche || '—'}
          </p>
          <p className="text-xs font-semibold text-violet-400">
            {topCloseNiche?.close_rate_pct || 0}% de conversão
          </p>
          <p className="text-[10px] text-muted-foreground">
            Ticket Médio: {formatCurrency(topCloseNiche?.avg_ticket_won || 0)}
          </p>
        </div>

        {/* Correlação: Leads com vs sem Site */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" /> Base Raspada (Maps)
          </span>
          <p className="text-lg font-bold text-foreground">
            {siteStats?.total_without_website ?? 0} sem site
          </p>
          <p className="text-xs text-blue-400 font-semibold">
            {siteStats?.total_with_website ?? 0} possuem site
          </p>
          <p className="text-[10px] text-muted-foreground">
            Excelente alvo para oferta de landing page
          </p>
        </div>
      </div>

      {/* Tabela do Funil Comparativo por Nicho */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/40 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-foreground" />
            Matriz de Eficiência do Funil Comercial
          </h3>
          <span className="text-[10px] text-muted-foreground">Ordenado por Faturamento Fechado</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/20 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">Nicho</th>
                <th className="px-3 py-3 text-center">Disparos</th>
                <th className="px-3 py-3 text-center">Respostas (%)</th>
                <th className="px-3 py-3 text-center">Leads no Funil</th>
                <th className="px-3 py-3 text-center">Reuniões</th>
                <th className="px-3 py-3 text-center">Vendas Fechadas</th>
                <th className="px-3 py-3 text-center">Taxa Fechamento</th>
                <th className="px-3 py-3 text-right">Ticket Médio</th>
                <th className="px-4 py-3 text-right">Faturamento Total</th>
                <th className="px-3 py-3 text-center">Score ICP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {niches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum disparo ou lead classificado por nicho ainda.
                  </td>
                </tr>
              ) : (
                sortedByRevenue.map((item, idx) => {
                  const isTop = idx === 0
                  return (
                    <tr
                      key={item.niche}
                      className={`hover:bg-secondary/20 transition-all ${
                        isTop ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-foreground capitalize flex items-center gap-2">
                        {isTop && <span className="text-amber-400">👑</span>}
                        {item.niche}
                      </td>
                      <td className="px-3 py-3 text-center font-mono">{item.total_dispatched}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-semibold px-2 py-0.5 rounded ${
                          item.reply_rate_pct >= 15
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'text-muted-foreground'
                        }`}>
                          {item.reply_rate_pct}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono">{item.total_leads_entered}</td>
                      <td className="px-3 py-3 text-center font-mono">{item.total_meetings}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-400">
                        {item.total_won}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold">
                        {item.close_rate_pct}%
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(item.avg_ticket_won)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">
                        {formatCurrency(item.total_won_revenue)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {item.total_won > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            🚀 Escalar
                          </span>
                        ) : item.total_dispatched > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            🧪 Testando
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Frio
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnóstico Preditivo */}
      <div className="p-4 rounded-xl bg-card border border-border flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground">Diretriz Comercial Recomendada:</p>
          <p className="text-muted-foreground leading-relaxed">
            Priorize campanhas no nicho com maior <strong>Ticket Médio</strong> e <strong>Taxa de Resposta</strong>.
            Leads sem site capturados no Lead Hunter possuem o maior índice de aceitação para ofertas de implantação de presença digital e tráfego pago.
          </p>
        </div>
      </div>
    </div>
  )
}
