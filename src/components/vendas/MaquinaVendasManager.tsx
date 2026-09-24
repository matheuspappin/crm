'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bot, Clock, Zap, Pause, Play, CheckCircle2, AlertTriangle, Save,
  MessageSquare, Radio, Sparkles, ShieldCheck, ArrowRight, RefreshCw, Send
} from 'lucide-react'

interface Props {
  initialSettings?: Record<string, any>
  stats?: {
    waitingDelay: number
    dispatchedTotal: number
    repliedTotal: number
    antiVacuoSent: number
  }
}

export function MaquinaVendasManager({ initialSettings = {}, stats }: Props) {
  const [loading, setLoading] = useState(false)
  const [savingBotSettings, setSavingBotSettings] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Configurações do Bot de Vendas Automático
  const [botStatus, setBotStatus] = useState<'active' | 'paused'>(
    initialSettings.bot_vendas_status || 'active'
  )
  const [offerDelayHours, setOfferDelayHours] = useState<string>(
    String(initialSettings.bot_oferta_delay_horas || '24')
  )
  const [antivacuoTimeoutHours, setAntivacuoTimeoutHours] = useState<string>(
    String(initialSettings.bot_antivacuo_timeout_horas || '24')
  )
  const [selectedNicheTab, setSelectedNicheTab] = useState<string>('estetica')
  
  const [scriptsByNiche, setScriptsByNiche] = useState<Record<string, string>>(
    initialSettings.bot_scripts_nicho || {
      estetica: 'Olá! Notei o perfil da {empresa} aqui em {cidade}. Desenvolvemos estruturas completas de captação e sites profissionais focados em lotar a agenda de procedimentos estéticos no WhatsApp. Gostaria de ver uma demonstração de como estruturamos esse modelo para clínicas?',
      psicologia: 'Olá {empresa}! Vi seu trabalho de psicologia em {cidade}. Criamos sites profissionais e posicionamento ético no Google para consultórios atraírem pacientes particulares. Faz sentido conversarmos 5 minutos?',
      odontologia: 'Olá! Acompanho o trabalho da {empresa} em {cidade}. Desenvolvemos páginas de alta conversão para consultórios odontológicos captarem procedimentos particulares no WhatsApp. Podemos trocar uma ideia rápida?',
      advocacia: 'Olá! Conheço a atuação do escritório {empresa} em {cidade}. Estruturamos sites de autoridade jurídica para escritórios de advocacia captarem clientes qualificados. Gostaria de conhecer nosso modelo?',
      geral: 'Olá! Acompanho o crescimento da {empresa} aqui em {cidade}. Desenvolvemos sites modernos e estruturas de vendas para multiplicar o volume de clientes pelo Google e WhatsApp. Podemos conversar rapidamente?',
    }
  )

  const [followupScriptsByNiche, setFollowupScriptsByNiche] = useState<Record<string, string>>(
    initialSettings.bot_followup_scripts_nicho || {
      estetica: 'Olá {nome}, tudo bem? Imagino que a rotina aí na clínica esteja bem corrida! Passando só para confirmar se conseguiu ver a mensagem anterior que enviei sobre o site profissional para a clínica? Um abraço!',
      psicologia: 'Olá {nome}! Imagino que a agenda de atendimentos esteja cheia. Só passando para checar se conseguiu dar uma olhada na mensagem anterior sobre o site do consultório? Abraço!',
      geral: 'Oi {nome}, tudo bem? Sei que a rotina na {empresa} é bem movimentada. Só passei para confirmar se conseguiu ver a mensagem anterior que te enviei sobre a criação do site? Abraço!',
    }
  )

  const [dispatchesList, setDispatchesList] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
    fetchRecentDispatches()
  }, [])

  function triggerToast(msg: string) {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  async function fetchSettings() {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('*')

      if (data && !error) {
        data.forEach((item: any) => {
          if (item.key === 'bot_vendas_status') {
            setBotStatus(item.value || 'active')
          }
          if (item.key === 'bot_oferta_delay_horas') {
            setOfferDelayHours(String(item.value || 24))
          }
          if (item.key === 'bot_antivacuo_timeout_horas') {
            setAntivacuoTimeoutHours(String(item.value || 24))
          }
          if (item.key === 'bot_scripts_nicho') {
            setScriptsByNiche(item.value || {})
          }
          if (item.key === 'bot_followup_scripts_nicho') {
            setFollowupScriptsByNiche(item.value || {})
          }
        })
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecentDispatches() {
    setLoadingList(true)
    try {
      const { data } = await (supabase as any)
        .from('outbound_dispatches')
        .select('*, campaign:outbound_campaigns(name, niche)')
        .order('sent_at', { ascending: false })
        .limit(10)
      if (data) setDispatchesList(data)
    } catch (err) {
      console.error('Erro ao buscar disparos:', err)
    } finally {
      setLoadingList(false)
    }
  }

  async function handleToggleBotStatus() {
    const newStatus = botStatus === 'active' ? 'paused' : 'active'
    const { error } = await (supabase as any)
      .from('system_settings')
      .update({ value: newStatus, updated_at: new Date().toISOString() })
      .eq('key', 'bot_vendas_status')

    if (!error) {
      setBotStatus(newStatus)
      triggerToast(`Bot de Vendas ${newStatus === 'active' ? 'retomado com sucesso' : 'pausado'}!`)
    } else {
      alert('Erro ao alterar status do bot: ' + error.message)
    }
  }

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
      triggerToast('Regras da Máquina de Vendas salvas com sucesso!')
    } catch (err: any) {
      alert('Erro ao salvar regras: ' + err.message)
    } finally {
      setSavingBotSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Cards de Status e Métricas do Bot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Operacional */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status do Bot</span>
            <span className={`w-3 h-3 rounded-full animate-pulse ${botStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500'}`} />
          </div>
          <div className="my-3">
            <div className="text-xl font-bold text-foreground flex items-center gap-2">
              {botStatus === 'active' ? (
                <>
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">Ativo & Operando</span>
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400">Pausado</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {botStatus === 'active' ? 'Disparando ofertas após o delay programado' : 'Nenhum lead está sendo abordado no momento'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleBotStatus}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
              botStatus === 'paused'
                ? 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500 shadow-sm'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
            }`}
          >
            {botStatus === 'paused' ? (
              <>
                <Play className="w-3.5 h-3.5 fill-black" /> Retomar Disparos Automáticos
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-amber-400" /> Pausar Máquina de Vendas
              </>
            )}
          </button>
        </div>

        {/* Delay Programado */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delay de Oferta</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-foreground">{offerDelayHours} horas</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Espera após o 4º chip confirmar ausência de site</p>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-center">
            Abordagem Natural & Anti-Bloqueio
          </span>
        </div>

        {/* Régua Anti-Vácuo */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Régua Anti-Vácuo</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-foreground">{antivacuoTimeoutHours} horas</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Prazo sem resposta antes do resgate automático</p>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-center">
            Retomada Automática Ativa
          </span>
        </div>

        {/* Nichos Ativos */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segmentos Ativos</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-foreground">5 Nichos</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Estética, Psicologia, Odonto, Advocacia, Geral</p>
          </div>
          <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 text-center">
            Copies Específicas por Segmento
          </span>
        </div>
      </div>

      {/* Painel Principal de Configurações da Máquina de Vendas */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400" />
              Controle do Motor de Vendas Automático (Bot da Empresa)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina o tempo de espera para o chip da agência mandar a oferta e os textos de abordagem por nicho.
            </p>
          </div>
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
                  Delay Programado
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

            {/* 2. Régua Anti-Vácuo */}
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

          {/* Roteiros de Oferta do Bot por Nicho */}
          <div className="p-5 rounded-xl bg-secondary/20 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-foreground">
                  Roteiros Comerciais do Bot por Nicho
                </label>
                <p className="text-[11px] text-muted-foreground">
                  A copy que o bot da agência envia oferecendo o desenvolvimento do site.
                </p>
              </div>

              {/* Nicho Tabs */}
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
                {['estetica', 'psicologia', 'odontologia', 'advocacia', 'geral'].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedNicheTab(n)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all capitalize ${
                      selectedNicheTab === n
                        ? 'bg-card text-foreground font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor de Copy de Oferta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground capitalize">
                  Mensagem de Oferta do Bot ({selectedNicheTab}):
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Tags: {'{empresa}'}, {'{nome}'}, {'{cidade}'}
                </span>
              </div>
              <textarea
                rows={3}
                value={scriptsByNiche[selectedNicheTab] || ''}
                onChange={(e) =>
                  setScriptsByNiche({ ...scriptsByNiche, [selectedNicheTab]: e.target.value })
                }
                placeholder={`Olá! Notei o perfil da {empresa} aqui em {cidade}...`}
                className="w-full text-xs font-mono bg-card border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none leading-relaxed"
              />
            </div>

            {/* Editor de Mensagem Anti-Vácuo */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground capitalize">
                  Mensagem de Retomada Anti-Vácuo ({selectedNicheTab}):
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Tags: {'{empresa}'}, {'{nome}'}, {'{cidade}'}
                </span>
              </div>
              <textarea
                rows={2}
                value={followupScriptsByNiche[selectedNicheTab] || followupScriptsByNiche['geral'] || ''}
                onChange={(e) =>
                  setFollowupScriptsByNiche({ ...followupScriptsByNiche, [selectedNicheTab]: e.target.value })
                }
                placeholder={`Olá {nome}, tudo bem? Passando só para confirmar se conseguiu ver a mensagem anterior...`}
                className="w-full text-xs font-mono bg-card border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Botão de Salvar Regras */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingBotSettings}
              className="px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingBotSettings ? 'Salvando...' : 'Salvar Regras da Máquina de Vendas'}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico / Feed de Atividade do Bot */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-foreground" />
            <h3 className="text-sm font-bold text-foreground">Últimos Leads Abordados pelo Bot</h3>
          </div>
          <button
            type="button"
            onClick={fetchRecentDispatches}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {dispatchesList.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            Nenhuma oferta disparada recentemente. Conforme os leads forem aquecidos e vencer o delay de {offerDelayHours}h, os registros aparecerão aqui em tempo real.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <th className="py-2.5 px-3">Empresa</th>
                  <th className="py-2.5 px-3">Contato</th>
                  <th className="py-2.5 px-3">Nicho</th>
                  <th className="py-2.5 px-3">Disparado em</th>
                  <th className="py-2.5 px-3">Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dispatchesList.map((d) => (
                  <tr key={d.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{d.company_name || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{d.phone}</td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground text-[10px]">
                        {d.campaign?.niche || 'geral'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {new Date(d.sent_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-3">
                      {d.replied ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                          Respondeu
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Aguardando resposta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
