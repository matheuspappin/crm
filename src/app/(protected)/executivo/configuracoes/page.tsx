'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Users, ArrowRightLeft, ShieldAlert } from 'lucide-react'

export default function SettingsPage() {
  const [distributionMode, setDistributionMode] = useState<string>('round_robin')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data, error } = await (supabase as any)
      .from('system_settings')
      .select('value')
      .eq('key', 'lead_distribution_mode')
      .single()

    if (data && data.value) {
      setDistributionMode(data.value)
    }
    setLoading(false)
  }

  async function handleSave(mode: string) {
    setSaving(true)
    const { error } = await (supabase as any)
      .from('system_settings')
      .update({ value: mode })
      .eq('key', 'lead_distribution_mode')

    if (!error) {
      setDistributionMode(mode)
    } else {
      alert('Erro ao salvar configuração. Verifique as permissões. ' + error.message)
    }
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
          <Settings className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações do Sistema</h1>
          <p className="text-muted-foreground mt-1">Gerencie regras globais e comportamentos automáticos do CRM.</p>
        </div>
      </div>

      <div className="glass-card p-6 border border-border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
          Distribuição de Leads
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Defina como os leads que entram (via Webhook ou API) são distribuídos para a equipe de vendas.
        </p>

        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Round Robin Card */}
            <button
              onClick={() => handleSave('round_robin')}
              disabled={saving}
              className={`text-left p-6 rounded-xl border transition-all ${
                distributionMode === 'round_robin' 
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'bg-card border-border hover:border-indigo-500/30 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Users className={`w-6 h-6 ${distributionMode === 'round_robin' ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                {distributionMode === 'round_robin' && (
                  <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">Ativo</span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-1">Roleta (Round Robin)</h3>
              <p className="text-sm text-muted-foreground">
                Distribui novos leads de forma igualitária e sequencial entre todos os vendedores.
              </p>
            </button>

            {/* Manual Card */}
            <button
              onClick={() => handleSave('manual')}
              disabled={saving}
              className={`text-left p-6 rounded-xl border transition-all ${
                distributionMode === 'manual' 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                : 'bg-card border-border hover:border-amber-500/30 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <ShieldAlert className={`w-6 h-6 ${distributionMode === 'manual' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                {distributionMode === 'manual' && (
                  <span className="text-xs font-semibold bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md">Ativo</span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-1">Distribuição Manual</h3>
              <p className="text-sm text-muted-foreground">
                Novos leads ficam sem dono e devem ser atribuídos manualmente pelo Super Admin.
              </p>
            </button>
            
          </div>
        )}
      </div>
    </div>
  )
}


