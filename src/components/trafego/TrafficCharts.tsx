'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { MvCac } from '@/types/database'

interface TrafficChartsProps {
  campaigns: MvCac[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-xl shadow-black/50">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-bold text-foreground">
              {entry.name === 'ROI' 
                ? formatPercent(entry.value) 
                : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function TrafficCharts({ campaigns }: TrafficChartsProps) {
  // Sort campaigns by revenue to show best performing first
  const sortedCampaigns = [...campaigns].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)).slice(0, 10)

  // Data for Spend vs Revenue
  const spendVsRevenueData = sortedCampaigns.map(c => ({
    name: c.campaign || 'Desconhecida',
    Gasto: c.total_spend || 0,
    Receita: c.total_revenue || 0,
  }))

  // Data for ROI and CAC
  const performanceData = sortedCampaigns.map(c => ({
    name: c.campaign || 'Desconhecida',
    ROI: c.roi_percent || 0,
    CAC: c.cac || 0,
  }))

  if (campaigns.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm mb-6">
        Dados insuficientes para gerar os gráficos.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* Chart 1: Revenue vs Spend */}
      <div className="glass-card p-5 rounded-xl border border-border">
        <div className="mb-4">
          <h3 className="font-semibold text-sm text-foreground">Gasto vs Receita por Campanha</h3>
          <p className="text-xs text-muted-foreground">Top 10 campanhas em faturamento</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendVsRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6b6b8a', fontSize: 10 }} 
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                axisLine={{ stroke: '#1e1e2e' }}
              />
              <YAxis 
                tick={{ fill: '#6b6b8a', fontSize: 10 }} 
                tickFormatter={(value) => `R$ ${value / 1000}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e1e2e', opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
              <Bar dataKey="Gasto" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: ROI and CAC */}
      <div className="glass-card p-5 rounded-xl border border-border">
        <div className="mb-4">
          <h3 className="font-semibold text-sm text-foreground">Análise de Eficiência (ROI e CAC)</h3>
          <p className="text-xs text-muted-foreground">Relação entre custo de aquisição e retorno</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6b6b8a', fontSize: 10 }} 
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                axisLine={{ stroke: '#1e1e2e' }}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fill: '#6b6b8a', fontSize: 10 }}
                tickFormatter={(value) => `${value}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fill: '#6b6b8a', fontSize: 10 }}
                tickFormatter={(value) => `R$ ${value}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e1e2e', opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
              <Bar yAxisId="left" dataKey="ROI" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="CAC" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
