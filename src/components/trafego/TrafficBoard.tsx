'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MonitorPlay, Settings, ExternalLink, CheckCircle2, ChevronRight, Briefcase } from 'lucide-react'
import type { TrafficOnboarding } from '@/types/database'
import { useRouter } from 'next/navigation'

interface Seller {
  id: string
  name: string
}

interface TrafficBoardProps {
  initialOnboardings: TrafficOnboarding[]
  managers: Seller[]
}

export function TrafficBoard({ initialOnboardings, managers }: TrafficBoardProps) {
  const [onboardings, setOnboardings] = useState<TrafficOnboarding[]>(initialOnboardings)
  const [editingId, setEditingId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    meta_ads_url: '',
    google_ads_url: '',
    daily_budget: '',
    assigned_traffic_manager: ''
  })

  function handleEdit(item: TrafficOnboarding) {
    setEditingId(item.id)
    setForm({
      meta_ads_url: item.meta_ads_url || '',
      google_ads_url: item.google_ads_url || '',
      daily_budget: item.daily_budget ? item.daily_budget.toString() : '',
      assigned_traffic_manager: item.assigned_traffic_manager || ''
    })
  }

  async function handleSave(id: string) {
    const { error } = await (supabase as any)
      .from('traffic_onboarding')
      .update({
        meta_ads_url: form.meta_ads_url || null,
        google_ads_url: form.google_ads_url || null,
        daily_budget: form.daily_budget ? Number(form.daily_budget) : null,
        assigned_traffic_manager: form.assigned_traffic_manager || null
      })
      .eq('id', id)

    if (!error) {
      setOnboardings(prev => prev.map(p => p.id === id ? { 
        ...p, 
        meta_ads_url: form.meta_ads_url || null,
        google_ads_url: form.google_ads_url || null,
        daily_budget: form.daily_budget ? Number(form.daily_budget) : null,
        assigned_traffic_manager: form.assigned_traffic_manager || null
      } : p))
      setEditingId(null)
      router.refresh()
    } else {
      alert('Erro ao salvar setup: ' + error.message)
    }
  }

  async function handleActivate(id: string) {
    if (!confirm('Tem certeza que as campanhas deste cliente estão ATIVAS?')) return
    
    const { error } = await (supabase as any)
      .from('traffic_onboarding')
      .update({ is_active: true })
      .eq('id', id)

    if (!error) {
      setOnboardings(prev => prev.map(p => p.id === id ? { ...p, is_active: true } : p))
      router.refresh()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Coluna 1: Setup Pendente */}
      <div className="flex flex-col h-[calc(100vh-280px)]">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Setup Pendente</h2>
            <span className="bg-secondary text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {onboardings.filter(p => !p.is_active).length}
            </span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {onboardings.filter(p => !p.is_active).map(item => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-5 hover:border-border transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">{item.lead?.company_name || item.lead?.name || 'Cliente Sem Nome'}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{item.lead?.project_description || 'Tráfego Pago'}</span>
                  </div>
                </div>
                {editingId === item.id ? (
                  <button onClick={() => handleSave(item.id)} className="text-xs bg-foreground hover:opacity-90 text-background px-3 py-1.5 rounded-lg transition-colors font-medium">
                    Salvar
                  </button>
                ) : (
                  <button onClick={() => handleEdit(item)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-border bg-secondary/50 hover:bg-secondary">
                    Editar Setup
                  </button>
                )}
              </div>

              {editingId === item.id ? (
                <div className="space-y-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Meta Ads (Gerenciador)</label>
                    <input 
                      value={form.meta_ads_url} onChange={e => setForm({...form, meta_ads_url: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="https://business.facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Google Ads URL</label>
                    <input 
                      value={form.google_ads_url} onChange={e => setForm({...form, google_ads_url: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="https://ads.google.com/..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Orçamento Diário (R$)</label>
                      <input 
                        type="number"
                        value={form.daily_budget} onChange={e => setForm({...form, daily_budget: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="100.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Gestor de Tráfego</label>
                      <select 
                        value={form.assigned_traffic_manager} onChange={e => setForm({...form, assigned_traffic_manager: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Nenhum</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MonitorPlay className="w-4 h-4 text-blue-500" />
                    {item.meta_ads_url ? (
                      <a href={item.meta_ads_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
                        Meta Ads Vinculado <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[#4b4b6a] italic">Aguardando Meta Ads...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Settings className="w-4 h-4 text-amber-500" />
                    {item.google_ads_url ? (
                      <a href={item.google_ads_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
                        Google Ads Vinculado <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[#4b4b6a] italic">Aguardando Google Ads...</span>
                    )}
                  </div>
                </div>
              )}

              {/* Botão de Ativar */}
              {!editingId && (
                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Verba/Dia: <span className="text-foreground font-medium mr-3">R$ {item.daily_budget || '0'}</span>
                    Gestor: <span className="text-foreground font-medium">{item.assigned_traffic_user?.name || 'Não atribuído'}</span>
                  </div>
                  <button onClick={() => handleActivate(item.id)} className="flex items-center gap-1.5 text-xs font-semibold bg-foreground/10 text-foreground px-3 py-1.5 rounded-lg hover:opacity-90/20 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ativar
                  </button>
                </div>
              )}
            </div>
          ))}

          {onboardings.filter(p => !p.is_active).length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
               <CheckCircle2 className="w-8 h-8 text-[#4b4b6a] mb-2" />
               <p className="text-sm text-muted-foreground">Nenhum setup de cliente pendente.</p>
             </div>
          )}
        </div>
      </div>

      {/* Coluna 2: Campanhas Ativas */}
      <div className="flex flex-col h-[calc(100vh-280px)] opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Campanhas Ativas</h2>
            <span className="bg-secondary text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {onboardings.filter(p => p.is_active).length}
            </span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          {onboardings.filter(p => p.is_active).map(item => (
            <div key={item.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {item.lead?.company_name || item.lead?.name || 'Cliente Sem Nome'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex gap-2">
                  <span>Gestor: {item.assigned_traffic_user?.name || 'N/A'}</span>
                  <span>|</span>
                  <span>Verba/Dia: R$ {item.daily_budget || '0'}</span>
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#4b4b6a]" />
            </div>
          ))}
          
          {onboardings.filter(p => p.is_active).length === 0 && (
             <div className="text-center p-6 text-sm text-muted-foreground">
               Não há campanhas ativas.
             </div>
          )}
        </div>
      </div>

    </div>
  )
}
