'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings, Users, ArrowRightLeft, ShieldAlert, Bot,
  Clock, Zap, Pause, Play, CheckCircle2, AlertTriangle, Save
} from 'lucide-react'
import { ExecutivoTabs } from '@/components/executivo/ExecutivoTabs'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [savingMode, setSavingMode] = useState(false)
  const [savingBotSettings, setSavingBotSettings] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Configurações de Distribuição
  const [distributionMode, setDistributionMode] = useState<string>('round_robin')

  // Configurações do Bot de Vendas Automático
  const [botStatus, setBotStatus] = useState<'active' | 'paused'>('active')
  const [offerDelayHours, setOfferDelayHours] = useState<string>('24')
  const [antivacuoTimeoutHours, setAntivacuoTimeoutHours] = useState<string>('24')
  const [selectedNicheTab, setSelectedNicheTab] = useState<string>('estetica')
  const [scriptsByNiche, setScriptsByNiche] = useState<Record<string, string>>({
    estetica: '',
    psicologia: '',
    odontologia: '',
    advocacia: '',
    geral: '',
  })
  const [followupScriptsByNiche, setFollowupScriptsByNiche] = useState<Record<string, string>>({
    estetica: '',
    psicologia: '',
    geral: '',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('*')

      if (data && !error) {
        data.forEach((item: any) => {
          if (item.key === 'lead_distribution_mode') {
            setDistributionMode(item.value || 'round_robin')
          }
          if (item.key === 'bot_vendas_status') {
            setBotStatus(item.value || 'active')
          }
          if (item.key === 'bot_oferta_delay_horas') {
            setOfferDelayHours(String(item.value || 24))
          }
          if (item.key === 'bot_antivacuo_timeout_horas') {
            setAntivacuoTimeoutHours(String(item.value || 24))
          }
          if (item.key === 'bot_scripts_nicho' && item.value) {
            setScriptsByNiche(item.value)
          }
          if (item.key === 'bot_followup_scripts_nicho' && item.value) {
            setFollowupScriptsByNiche(item.value)
          }
        })
      }
    } catch (e) {
      console.error('Erro ao buscar configurações:', e)
    } finally {
      setLoading(false)
    }
  }

  const triggerToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  // Salvar Modo de Distribuição
  async function handleSaveDistribution(mode: string) {
    setSavingMode(true)
    const { error } = await (supabase as any)
      .from('system_settings')
      .update({ value: mode, updated_at: new Date().toISOString() })
      .eq('key', 'lead_distribution_mode')

    if (!error) {
      setDistributionMode(mode)
      triggerToast('Modo de distribuição atualizado com sucesso!')
    } else {
      alert('Erro ao salvar configuração: ' + error.message)
    }
    setSavingMode(false)
  }

  // Alternar Status do Bot (Pausar / Retomar)
  async function handleToggleBotStatus() {
    const newStatus = botStatus === 'active' ? 'paused' : 'active'
    const { error } = await (supabase as any)
      .from('system_settings')
      .update({ value: newStatus, updated_at: new Date().toISOString() })
      .eq('key', 'bot_vendas_status')

    if (!error) {
      setBotStatus(newStatus)
      triggerToast(`Bot de Vendas ${newStatus === 'active' ? 'retomado' : 'pausado'}!`)
    } else {
      alert('Erro ao alterar status do bot: ' + error.message)
    }
  }

  // Salvar Configurações do Bot de Vendas
  async function handleSaveBotSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingBotSettings(true)

    try {
      const delayNum = parseInt(offerDelayHours) || 24
      const timeoutNum = parseInt(antivacuoTimeoutHours) || 24

      const updates = [
        (supabase as any).from('system_settings').update({ value: delayNum, updated_at: new Date().toISOString() }).eq('key', 'bot_oferta_delay_horas'),
        (supabase as any).from('system_settings').update({ value: timeoutNum, updated_at: new Date().toISOString() }).eq('key', 'bot_antivacuo_timeout_horas'),
        (supabase as any).from('system_settings').update({ value: scriptsByNiche, updated_at: new Date().toISOString() }).eq('key', 'bot_scripts_nicho'),
        (supabase as any).from('system_settings').update({ value: followupScriptsByNiche, updated_at: new Date().toISOString() }).eq('key', 'bot_followup_scripts_nicho'),
      ]

      await Promise.all(updates)
      triggerToast('Configurações do Bot de Vendas salvas com sucesso!')
    } catch (err: any) {
      alert('Erro ao salvar configurações do bot: ' + err.message)
    } finally {
      setSavingBotSettings(false)
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Feedback */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-black px-4 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          {successToast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-foreground/10 flex items-center justify-center border border-border">
          <Settings className="w-6 h-6 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle global da Máquina de Vendas Automática, delay entre aquecimento e oferta, e distribuição de leads.
          </p>
        </div>
      </div>

      {/* Navegação Executiva */}
      <ExecutivoTabs activeTab="configuracoes" />

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground">
          Carregando configurações do sistema...
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SEÇÃO 1: MÁQUINA DE VENDAS & BOT AUTOMÁTICO (NOVO) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-400" />
                  Máquina de Vendas Automática (Bot da Empresa)
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Controla o tempo de disparo automático da oferta comercial após o lead ser aquecido pelos 4 chips compradores.
                </p>
              </div>

              {/* Botão Pausar / Retomar Bot */}
              <button
                type="button"
                onClick={handleToggleBotStatus}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                  botStatus === 'paused'
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500 shadow-sm'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
                }`}
              >
                {botStatus === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" /> Retomar Bot de Vendas
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-amber-400" /> Pausar Bot de Vendas
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSaveBotSettings} className="space-y-6">
              
              {/* Controles de Tempo (Delay e Anti-Vácuo) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Delay para o Bot Chamar */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Espera após o Aquecimento:
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Quanto tempo o Bot da Empresa aguarda após o lead confirmar ausência de site para o comprador, antes de chamar oferecendo o site.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      required
                      value={offerDelayHours}
                      onChange={(e) => setOfferDelayHours(e.target.value)}
                      className="w-20 text-center text-sm font-bold bg-card border border-border rounded-xl px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    />
                    <span className="text-xs font-semibold text-foreground">horas de espera</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                    <span className="text-muted-foreground">Atalhos:</span>
                    <button type="button" onClick={() => setOfferDelayHours('2')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground">2h</button>
                    <button type="button" onClick={() => setOfferDelayHours('4')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground">4h</button>
                    <button type="button" onClick={() => setOfferDelayHours('12')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground">12h</button>
                    <button type="button" onClick={() => setOfferDelayHours('24')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground font-bold">24h (Padrão)</button>
                  </div>
                </div>

                {/* 2. Régua Anti-Vácuo do Bot */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Régua Anti-Vácuo do Bot:
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Automático
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se o lead não responder à oferta da agência dentro desse prazo, o bot dispara sozinho a mensagem de retomada para recuperar o contato.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      required
                      value={antivacuoTimeoutHours}
                      onChange={(e) => setAntivacuoTimeoutHours(e.target.value)}
                      className="w-20 text-center text-sm font-bold bg-card border border-border rounded-xl px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    />
                    <span className="text-xs font-semibold text-foreground">horas sem resposta</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                    <span className="text-muted-foreground">Atalhos:</span>
                    <button type="button" onClick={() => setAntivacuoTimeoutHours('12')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground">12h</button>
                    <button type="button" onClick={() => setAntivacuoTimeoutHours('24')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground font-bold">24h (Padrão)</button>
                    <button type="button" onClick={() => setAntivacuoTimeoutHours('48')} className="px-2 py-0.5 rounded bg-secondary hover:bg-card text-foreground">48h</button>
                  </div>
                </div>

              </div>

              {/* 3. Editor de Copies de Oferta e Retomada por Nicho */}
              <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Roteiros Comerciais do Bot por Nicho</h3>
                    <p className="text-[11px] text-muted-foreground">
                      A copy que o bot da agência envia oferecendo o desenvolvimento do site.
                    </p>
                  </div>

                  {/* Tabs de Nicho */}
                  <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl border border-border text-xs overflow-x-auto">
                    {['estetica', 'psicologia', 'odontologia', 'advocacia', 'geral'].map((niche) => (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => setSelectedNicheTab(niche)}
                        className={`px-3 py-1 rounded-lg font-medium capitalize transition-all whitespace-nowrap ${
                          selectedNicheTab === niche
                            ? 'bg-foreground text-background font-bold shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        Mensagem de Oferta do Bot ({selectedNicheTab}):
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Tags: {'{empresa}'}, {'{nome}'}, {'{cidade}'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={scriptsByNiche[selectedNicheTab] || ''}
                      onChange={(e) => setScriptsByNiche({
                        ...scriptsByNiche,
                        [selectedNicheTab]: e.target.value
                      })}
                      className="w-full text-xs bg-card border border-border rounded-xl p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        Mensagem de Retomada Anti-Vácuo ({selectedNicheTab}):
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Tags: {'{empresa}'}, {'{nome}'}, {'{cidade}'}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={followupScriptsByNiche[selectedNicheTab] || followupScriptsByNiche['geral'] || ''}
                      onChange={(e) => setFollowupScriptsByNiche({
                        ...followupScriptsByNiche,
                        [selectedNicheTab]: e.target.value
                      })}
                      className="w-full text-xs bg-card border border-border rounded-xl p-3 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Salvar Configurações do Bot */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingBotSettings}
                  className="px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingBotSettings ? 'Salvando Configurações...' : 'Salvar Regras do Bot de Vendas'}
                </button>
              </div>

            </form>
          </div>

          {/* SEÇÃO 2: MODO DE DISTRIBUIÇÃO DOS LEADS */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                Modo de Distribuição dos Leads no Funil
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Defina se novos leads gerados manualmente ou via webhook caem por roleta ou são distribuídos em lotes pelo Super Admin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Distribuição por Lotes / Manual */}
              <button
                type="button"
                onClick={() => handleSaveDistribution('manual')}
                disabled={savingMode}
                className={`text-left p-5 rounded-2xl border transition-all ${
                  distributionMode === 'manual'
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                    : 'bg-secondary/30 border-border hover:border-foreground/30 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <ShieldAlert className={`w-5 h-5 ${distributionMode === 'manual' ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  {distributionMode === 'manual' && (
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">Ativo</span>
                  )}
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1">Distribuição por Lotes (Recomendado)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os pacotes gerados pelo robô e pelo bot de vendas ficam agrupados para o Super Admin inspecionar e despachar lotes de acordo com o nicho.
                </p>
              </button>

              {/* Roleta Round Robin */}
              <button
                type="button"
                onClick={() => handleSaveDistribution('round_robin')}
                disabled={savingMode}
                className={`text-left p-5 rounded-2xl border transition-all ${
                  distributionMode === 'round_robin'
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm'
                    : 'bg-secondary/30 border-border hover:border-foreground/30 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Users className={`w-5 h-5 ${distributionMode === 'round_robin' ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                  {distributionMode === 'round_robin' && (
                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">Ativo</span>
                  )}
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1">Roleta Sequencial (Round Robin)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Distribui novos leads imediatamente de forma sequencial e igualitária entre todos os vendedores da equipe comercial.
                </p>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
