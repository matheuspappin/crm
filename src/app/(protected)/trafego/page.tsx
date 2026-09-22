import { createClient } from '@/lib/supabase/server'
import { Target, DollarSign, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { MvCac, TrafficOnboarding } from '@/types/database'
import { TrafficCharts } from '@/components/trafego/TrafficCharts'
import { TrafficBoard } from '@/components/trafego/TrafficBoard'
import { TrafficTabs } from './TrafficTabs'

export default async function TrafegoPage() {
  const supabase = await createClient()

  // Fetch metrics data
  const { data: mvCac } = await supabase
    .from('mv_cac')
    .select('*')
    .order('total_spend', { ascending: false })

  const campaigns = (mvCac ?? []) as unknown as MvCac[]

  // Calculate totals
  const totalSpend = campaigns.reduce((acc, curr) => acc + (curr.total_spend || 0), 0)
  const totalRevenue = campaigns.reduce((acc, curr) => acc + (curr.total_revenue || 0), 0)
  const totalLeads = campaigns.reduce((acc, curr) => acc + (curr.total_leads || 0), 0)
  const avgROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0

  // Fetch onboarding data and managers
  const [{ data: onboardings }, { data: managers }] = await Promise.all([
    supabase
      .from('traffic_onboarding')
      .select('*, lead:leads(*), assigned_traffic_user:users!assigned_traffic_manager(name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name')
      .in('role', ['trafego', 'owner'])
  ])

  const onboardingsData = (onboardings ?? []) as unknown as TrafficOnboarding[]
  const managersData = managers ?? []

  const MetricsComponent = (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Receita Total
          </div>
          <span className="text-2xl font-bold text-gradient">{formatCurrency(totalRevenue)}</span>
          <span className="text-xs text-muted-foreground">leads fechados</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Gasto Total
          </div>
          <span className="text-2xl font-bold text-amber-400">{formatCurrency(totalSpend)}</span>
          <span className="text-xs text-muted-foreground">investido em ads</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Users className="w-3.5 h-3.5" />
            Total de Leads
          </div>
          <span className="text-2xl font-bold text-foreground">{totalLeads}</span>
          <span className="text-xs text-muted-foreground">todas as campanhas</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            ROI Médio
          </div>
          <span className={`text-2xl font-bold ${avgROI >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(avgROI)}
          </span>
          <span className="text-xs text-muted-foreground">retorno sobre gasto</span>
        </div>
      </div>

      <TrafficCharts campaigns={campaigns} />

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Desempenho por Campanha</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">Campanha</th>
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">Origem</th>
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">Leads</th>
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">Gasto</th>
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">Receita</th>
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">CAC</th>
                <th className="py-3 px-5 text-xs font-semibold text-muted-foreground">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2e]">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Nenhuma campanha registrada ainda.
                    <br />
                    <span className="text-xs">Os dados aparecerão após o webhook do Meta/Google ingerir leads com UTMs.</span>
                  </td>
                </tr>
              ) : (
                campaigns.map((c, i) => (
                  <tr key={i} className="hover:bg-card transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground max-w-[150px] truncate">{c.campaign}</td>
                    <td className="px-4 py-3">
                      <span className="badge-status bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {c.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.total_leads}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">{c.closed_leads}</td>
                    <td className="px-4 py-3 font-semibold text-gradient">{formatCurrency(c.total_revenue || 0)}</td>
                    <td className="px-4 py-3 text-amber-400">{formatCurrency(c.total_spend || 0)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(c.cac || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${(c.roi_percent || 0) >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatPercent(c.roi_percent || 0)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Aviso de integração */}
      <div className="mt-4 glass-card p-4 border-l-4 border-violet-500">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-violet-400">Integração Live:</span> Para injetar gastos reais das campanhas Meta/Google,
          configure as chaves de API. Os dados de gasto são inseridos na tabela <code className="bg-secondary px-1 rounded text-violet-300">ad_spend</code> via cron.
        </p>
      </div>
    </>
  )

  const BoardComponent = (
    <TrafficBoard initialOnboardings={onboardingsData} managers={managersData} />
  )

  return (
    <div className="p-6 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground/20 border border-foreground/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestão de Tráfego</h1>
            <p className="text-xs text-muted-foreground">Análise de campanhas e setup de clientes</p>
          </div>
        </div>
      </div>

      <TrafficTabs metricsComponent={MetricsComponent} boardComponent={BoardComponent} />
    </div>
  )
}
