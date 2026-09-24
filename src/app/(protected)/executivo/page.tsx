export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import {
  Crown, TrendingUp, DollarSign, Users, Zap,
  Clock, Target, AlertTriangle, CheckCircle2, BarChart3
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { ExecutiveDashboard, MvMrr, MvWinRate, NicheFunnelAnalytics } from '@/types/database'
import { NicheIntelligenceSection } from '@/components/executivo/NicheIntelligenceSection'
import { ExecutivoTabs } from '@/components/executivo/ExecutivoTabs'

export default async function ExecutivoPage() {
  const supabase = await createClient()

  const [
    { data: dash },
    { data: mrrHistory },
    { data: winRateHistory },
    { data: nicheFunnel },
    { data: siteStats },
  ] = await Promise.all([
    supabase.from('vw_executive_dashboard').select('*').single(),
    supabase.from('mv_mrr').select('*').order('month', { ascending: false }).limit(6),
    supabase.from('mv_win_rate').select('*').order('month', { ascending: false }).limit(3),
    supabase.from('vw_niche_funnel_analytics').select('*').order('total_won_revenue', { ascending: false }),
    (supabase as any).rpc('get_scraped_conversion_stats'),
  ])

  const dashboard = dash as ExecutiveDashboard | null
  const mrr = (mrrHistory ?? []) as MvMrr[]
  const winRate = (winRateHistory ?? []) as MvWinRate[]
  const niches = (nicheFunnel ?? []) as NicheFunnelAnalytics[]
  const scrapedStats = (siteStats ?? null) as any

  const metrics = [
    {
      label: 'MRR Atual',
      value: formatCurrency(dashboard?.current_mrr ?? 0),
      iconNode: <DollarSign className="w-5 h-5 text-emerald-400" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      sub: 'Receita mensal recorrente',
    },
    {
      label: 'Leads Ativos',
      value: String(dashboard?.active_leads ?? 0),
      iconNode: <Users className="w-5 h-5 text-foreground" />,
      color: 'text-foreground',
      bg: 'bg-foreground/10 border-border/40',
      sub: 'No funil agora',
    },
    {
      label: 'Win Rate',
      value: formatPercent(dashboard?.current_win_rate ?? 0),
      iconNode: <Target className="w-5 h-5 text-violet-400" />,
      color: dashboard?.current_win_rate && dashboard.current_win_rate >= 30 ? 'text-emerald-400' : 'text-amber-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      sub: 'Taxa de fechamento',
    },
    {
      label: 'Pipeline Velocity',
      value: `${dashboard?.current_avg_days?.toFixed(1) ?? '—'} dias`,
      iconNode: <Clock className="w-5 h-5 text-amber-400" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      sub: 'Tempo médio para fechar',
    },
    {
      label: 'CAC Médio',
      value: formatCurrency(dashboard?.avg_cac ?? 0),
      iconNode: <TrendingUp className="w-5 h-5 text-violet-400" />,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      sub: 'Custo de aquisição',
    },
    {
      label: 'Projetos em Fila',
      value: String(dashboard?.projects_in_progress ?? 0),
      iconNode: <Zap className="w-5 h-5 text-blue-400" />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      sub: 'Aguardando entrega',
    },
  ]

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Visão executiva consolidada — dados em tempo real</p>
          </div>
        </div>
        {dashboard && dashboard.pixel_issues && dashboard.pixel_issues > 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">
              {dashboard.pixel_issues} pixel{dashboard.pixel_issues > 1 ? 's' : ''} com problema
            </span>
          </div>
        ) : null}
      </div>

      {/* Navegação Executiva */}
      <ExecutivoTabs activeTab="dashboard" />

      {/* Grid de métricas */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {metrics.map((m) => {
          return (
            <div key={m.label} className={`metric-card border ${m.bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl bg-current/10 border border-current/20 flex items-center justify-center ${m.bg}`}>
                  {m.iconNode}
                </div>
              </div>
              <span className={`text-3xl font-bold ${m.color}`}>{m.value}</span>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              <p className="text-[10px] text-muted-foreground/70">{m.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Módulo de Inteligência de Nichos & ICP Vencedor */}
      <div className="mb-8">
        <NicheIntelligenceSection initialNiches={niches} siteStats={scrapedStats} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Histórico MRR */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-foreground">Histórico de Receita (6m)</h2>
          </div>
          <div className="space-y-2">
            {mrr.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sem dados históricos. As MVs são atualizadas a cada hora via pg_cron.
              </p>
            ) : (
              mrr.map((m) => {
                const max = Math.max(...mrr.map((x) => x.total_revenue))
                const pct = max > 0 ? (m.total_revenue / max) * 100 : 0
                return (
                  <div key={m.month}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">
                        {formatCurrency(m.total_revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Win Rate histórico */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-foreground">Funil de Conversão (3m)</h2>
          </div>
          <div className="space-y-3">
            {winRate.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sem dados ainda. Os dados aparecem quando há leads no sistema.
              </p>
            ) : (
              winRate.map((wr) => (
                <div key={wr.month} className="rounded-lg bg-[#0d0d14] border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {new Date(wr.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className={`text-sm font-bold ${wr.win_rate_percent >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatPercent(wr.win_rate_percent)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{wr.total_leads}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{wr.total_won}</p>
                      <p className="text-[10px] text-muted-foreground">Fechados</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-400">{wr.total_lost}</p>
                      <p className="text-[10px] text-muted-foreground">Perdidos</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status geral da agência */}
        <div className="col-span-2 glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Status da Agência</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Webhook Meta', status: 'ok', desc: 'Recebendo leads' },
              { label: 'pg_cron SLA', status: 'ok', desc: 'A cada 30min' },
              { label: 'MVs Tráfego', status: 'ok', desc: 'Refresh 1h/1h' },
              {
                label: 'Pixels',
                status: (dashboard?.pixel_issues ?? 0) > 0 ? 'error' : 'ok',
                desc: (dashboard?.pixel_issues ?? 0) > 0
                  ? `${dashboard?.pixel_issues} com problema`
                  : 'Todos ativos',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-[#0d0d14] border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`pixel-dot ${item.status}`} />
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

