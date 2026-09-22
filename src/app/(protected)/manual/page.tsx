"use client"
import React, { useState } from 'react'
import {
  BookOpen,
  Phone,
  Calendar,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  ChevronRight,
  ArrowRight,
  Users,
  Target,
  Handshake,
  FileText,
  Clock
} from 'lucide-react'

// ─── Data ──────────────────────────────────────────────────────────────────────

const phases = [
  {
    id: 1,
    icon: Phone,
    color: 'indigo',
    title: '1º Contato (WhatsApp)',
    subtitle: 'Objetivo: Gerar uma resposta. Nada mais.',
    description: 'O erro mais comum é empurrar conteúdo cedo demais. Não mande portfólio, preço ou site de exemplo logo de cara.',
    dos: [
      'Mensagens curtas e diretas',
      'Termine SEMPRE com 1 pergunta',
      'Espace envios para evitar bans (Google API)',
      'Use o nome da empresa ou do cliente',
    ],
    donts: [
      'Textão no primeiro contato (Regra do Panfleto)',
      'Disparar a mesma mensagem (Risco de Ban)',
      'Mandar portfólio, links ou preços',
      'Mensagem genérica sem personalização',
    ],
    scripts: [
      {
        label: 'Lead Captado via Google API (Frio)',
        text: 'Oi, pessoal da [Empresa], bom dia! Vi o perfil de vocês no Google e achei bem legal o modelo. Estava pesquisando sobre [Nicho] na região — são vocês mesmos que cuidam dos clientes pelo Whats?'
      },
      {
        label: 'Lead de Tráfego Pago',
        text: 'Oi [Nome]! Vi que você se interessou pela nossa solução. Me conta rapidinho: você já tem um site hoje ou ainda não tem presença online?'
      },
      {
        label: 'Lead por Indicação',
        text: 'Oi [Nome], tudo bem? Fui indicado por [Nome do indicador] — ele falou que você quer turbinar as vendas online. Pode me contar um pouco do seu negócio?'
      }
    ]
  },
  {
    id: 2,
    icon: Target,
    color: 'violet',
    title: 'Qualificação (Triagem)',
    subtitle: 'Objetivo: Saber se vale investir o seu tempo.',
    description: 'Antes de gastar horas numa proposta, você precisa saber se o lead pode e quer comprar. Use o BANT adaptado.',
    dos: [
      'Descubra quem toma a decisão final',
      'Entenda o orçamento disponível',
      'Identifique a urgência real',
      'Entenda a dor antes de propor',
    ],
    donts: [
      'Ignorar o tomador de decisão',
      'Pular a qualificação por pressa',
      'Propor solução sem entender o problema',
      'Avançar com lead sem orçamento',
    ],
    scripts: [
      {
        label: 'Orçamento',
        text: 'Você já tem uma ideia de quanto quer investir? Pergunto pra te apresentar a melhor opção dentro da sua realidade.'
      },
      {
        label: 'Decisão',
        text: 'Além de você, tem mais alguém que precisa dar ok nisso? Sócio, cônjuge?'
      },
      {
        label: 'Urgência',
        text: 'Você tem algum prazo em mente? Uma data de lançamento, evento, alta temporada?'
      }
    ]
  },
  {
    id: 3,
    icon: Users,
    color: 'teal',
    title: 'Reunião de Diagnóstico',
    subtitle: 'Objetivo: Entender a dor. Só aqui você mostra portfólio.',
    description: 'Quem pergunta, lidera a conversa. Duração ideal: 30-45 minutos por videochamada ou presencial.',
    dos: [
      'Pergunte mais do que fale',
      'Mostre portfólio só após entender a dor',
      'Apresente resultados, não apenas design',
      'Mostre casos parecidos com o negócio dele',
    ],
    donts: [
      'Falar da empresa antes de ouvir o cliente',
      'Mostrar portfólio logo na abertura',
      'Apresentar preço nessa fase',
      'Deixar a reunião passar de 1 hora',
    ],
    scripts: [
      {
        label: 'Abertura',
        text: 'Antes de qualquer coisa, obrigado por reservar esse tempo. Quero entender seu negócio antes de falar qualquer solução. O que você vende e pra quem você vende?'
      },
      {
        label: 'Descoberta da Dor',
        text: 'Como os clientes te encontram hoje? O que já tentou no digital? O que funcionou e o que não funcionou?'
      },
      {
        label: 'Visão de Futuro',
        text: 'Se daqui a 12 meses as coisas estiverem ótimas, como você sabe que está? O que te impede de chegar lá hoje?'
      }
    ]
  },
  {
    id: 4,
    icon: FileText,
    color: 'amber',
    title: 'Apresentação da Proposta',
    subtitle: 'Objetivo: Apresentar ao vivo, nunca só por PDF.',
    description: 'Nunca mande a proposta sem marcar uma hora pra apresentar. Proposta enviada sem contexto = lead perdido.',
    dos: [
      'Apresente as 3 opções (básico, ideal, premium)',
      'A âncora de preço faz a opção do meio parecer razoável',
      'Repita a dor do cliente antes de propor',
      'Deixe claro o que acontece depois do "sim"',
    ],
    donts: [
      'Mandar PDF por WhatsApp sem apresentar',
      'Dar apenas 1 opção de preço',
      'Proposta genérica que não cita o problema dele',
      'Apresentar sem os próximos passos definidos',
    ],
    scripts: [
      {
        label: 'Para agendar a apresentação',
        text: 'Vou preparar algo personalizado pro seu negócio. Quando você tem 20 minutinhos amanhã pra eu te mostrar?'
      },
      {
        label: 'Abertura da apresentação',
        text: 'Com base no que você me contou — que [resumir a dor] — eu preparei 3 caminhos possíveis. Deixa eu te mostrar...'
      }
    ]
  },
  {
    id: 5,
    icon: Handshake,
    color: 'rose',
    title: 'Negociação e Objeções',
    subtitle: 'Objetivo: Vencer objeções com perguntas, não com defesa.',
    description: 'Responder defende. Perguntar avança. Nunca negocie por WhatsApp — negociação séria = voz ou vídeo.',
    dos: [
      'Responda objeções com uma pergunta de volta',
      'Mostre valor antes de negociar preço',
      'Mantenha a conversa em voz/vídeo',
      'Valide a objeção antes de responder',
    ],
    donts: [
      'Baixar preço sem perguntar o porquê',
      'Defender o produto de forma passional',
      'Negociar por WhatsApp',
      'Aceitar "estou pensando" sem investigar',
    ],
    scripts: [
      {
        label: '"Está caro."',
        text: 'Entendo. Você está comparando com o quê? Se a gente fechar 2 clientes pra você com esse trabalho, o investimento já se paga. O que precisa acontecer pra fazer sentido?'
      },
      {
        label: '"Deixa eu pensar."',
        text: 'Com certeza! Me ajuda a entender: o que você ainda precisa pensar? É o valor, o prazo, ficou alguma dúvida? Assim te ajudo a decidir.'
      },
      {
        label: '"Me manda mais informações."',
        text: 'Claro! Só que informação por mensagem fica difícil de contextualizar. Você prefere amanhã às 10h ou às 14h pra eu te mostrar direitinho?'
      },
      {
        label: '"Vou falar com meu sócio."',
        text: 'Faz sentido! Quando vocês podem se reunir? Posso entrar numa chamada com os dois pra tirar as dúvidas de uma vez.'
      }
    ]
  },
  {
    id: 6,
    icon: CheckCircle2,
    color: 'emerald',
    title: 'Fechamento',
    subtitle: 'Objetivo: Você pede o sim. Nunca espere o cliente pedir.',
    description: 'Após o "sim", confirme imediatamente e envie o contrato em até 2 horas. A empolgação do cliente dura pouco.',
    dos: [
      'Peça o fechamento de forma direta',
      'Use urgência real (vagas, datas)',
      'Envie o contrato em até 2h após o "sim"',
      'Explique o que acontece depois do ok',
    ],
    donts: [
      'Esperar o cliente pedir para comprar',
      'Inventar urgência falsa',
      'Fechar e sumir sem comunicar os próximos passos',
      'Demorar dias pra enviar o contrato',
    ],
    scripts: [
      {
        label: 'Fechamento Direto',
        text: 'Com base em tudo que conversamos, faz sentido avançar? Podemos começar essa semana.'
      },
      {
        label: 'Por Urgência Real',
        text: 'Nossa agenda de novos projetos abre em [data]. Se quiser garantir sua vaga, precisamos fechar até [data], senão vai pra lista do próximo mês.'
      },
      {
        label: 'Pela Próxima Etapa',
        text: 'Ótimo! Então o próximo passo é assinar o contrato e passar o sinal. Você prefere Pix ou boleto?'
      }
    ]
  }
]

const objections = [
  { obj: '"Está caro."', answer: '"Você está comparando com o quê? Se fecharmos 2 clientes com esse trabalho, o investimento já se paga."' },
  { obj: '"Deixa eu pensar."', answer: '"O que você ainda precisa pensar? É o valor, o prazo, ficou alguma dúvida?"' },
  { obj: '"Já tenho agência."', answer: '"Ótimo! E está trazendo clientes de forma consistente?" (aguarde e deixe ele responder)' },
  { obj: '"Me manda informações."', answer: '"Quando posso te mostrar ao vivo? Amanhã às 10h ou 14h?"' },
  { obj: '"Vou falar com meu sócio."', answer: '"Quando posso entrar numa chamada com os dois de uma vez?"' },
]

const tripwires = [
  {
    id: 'restaurantes',
    niche: 'Restaurantes (Fuga do iFood)',
    offer: 'Site de Pedidos + Estratégia QR Code',
    price: 'R$ 549 (Setup)',
    pitch: 'Pare de deixar 20% do faturamento no iFood. Por R$ 549 eu crio seu cardápio próprio e te dou a arte do QR Code pra colocar na sacola e trazer o cliente pro seu site.',
    details: 'Esta estratégia foca em libertar o restaurante das taxas abusivas dos aplicativos de delivery. O objetivo é vender um sistema próprio (setup rápido) e entregar a inteligência (QR Code na sacola). Quando o cliente final escaneia o código em casa, ele ganha um desconto e passa a comprar direto no seu sistema.',
    methods: [
      'Prospecção (Google Maps): Pesquisar restaurantes locais focando naqueles que têm links do iFood no Google.',
      'Abertura: "Oi [Nome], vi vocês aqui no iFood e no Google. O volume de pedidos pelo app tá alto aí na região?"',
      'Transição: "Pergunto porque ajudamos restaurantes a fugir da taxa de 27% do iFood. Montamos um sistema próprio e ensinamos a converter o cliente da sacola pro seu site."',
      'Fechamento: Oferecer a montagem rápida por R$ 549, sem burocracia.'
    ]
  },
  {
    id: 'akaaicore',
    niche: 'AKAAICORE (Wellness & Fitness)',
    offer: 'Setup de Recuperação de Inativos',
    price: 'R$ 549 (Setup)',
    pitch: 'Em vez de trocar todo o sistema hoje, me deixa instalar o módulo de recuperação. Por R$ 549 a gente puxa os alunos inativos e roda uma campanha pra recuperar o seu caixa.',
    details: 'Donos de academia têm muita resistência em trocar de sistema (fricção). A isca de "Recuperação de Inativos" foca em trazer dinheiro rápido para o dono da academia. Após ele ver o resultado financeiro, a migração para o sistema completo (AKAAICORE) é natural.',
    methods: [
      'Prospecção: Academias, studios de pilates e spas com presença razoável no Google/Instagram.',
      'Abertura: "Oi [Nome], vi a estrutura da academia de vocês, sensacional. Como está a taxa de renovação e evasão dos alunos hoje?"',
      'Transição: "Nós temos uma ferramenta focada apenas em resgatar alunos inativos e inadimplentes de forma automática. Tem academia recuperando de R$ 5k a R$ 10k por mês só com isso."',
      'Fechamento: Instalar o módulo de CRM/Cobrança por R$ 549 (Setup) para provar o valor na prática.'
    ]
  },
  {
    id: 'totens',
    niche: 'Totens de Autoatendimento',
    offer: 'Projeto Piloto de Totem',
    price: 'R$ 999 + Aluguel',
    pitch: 'Não compre a máquina de 15 mil agora. Pague o setup de 999 e alugue o primeiro mês. Se reduzir a fila e der lucro, abatemos esse valor na compra.',
    details: 'Vender hardware exige um investimento alto (Capex). O "Projeto Piloto" reduz essa barreira de entrada drasticamente, colocando a máquina no estabelecimento do cliente com risco quase zero para ele.',
    methods: [
      'Prospecção: Fast foods locais, hamburguerias e clínicas com alto fluxo no balcão e filas no horário de pico.',
      'Abertura: "Oi [Nome], vi que o movimento de vocês no final de semana é intenso. Vocês têm sofrido com fila no balcão ou erro de pedido na cozinha?"',
      'Transição: "Nós instalamos totens de autoatendimento que reduzem a fila e aumentam o ticket médio, sem você precisar comprar a máquina de cara."',
      'Fechamento: Cobrar R$ 999 pela instalação e setup inicial, mais o aluguel mensal. Se ele quiser comprar depois, abate o valor.'
    ]
  },
  {
    id: 'landing_pages',
    niche: 'Landing Pages Genéricas',
    offer: 'Página de Conversão em 48h',
    price: 'R$ 499 (Setup)',
    pitch: 'Investir em anúncio e mandar direto pro WhatsApp queima dinheiro. Por R$ 499 eu boto uma página no ar em 2 dias pra dobrar sua taxa de captação.',
    details: 'Muitos negócios locais investem em tráfego pago mas jogam o clique direto no WhatsApp sem filtro, ou têm apenas um Instagram amador. A Landing Page é vendida como um ativo rápido de alta conversão.',
    methods: [
      'Prospecção (Biblioteca de Anúncios Meta): Buscar prestadores de serviço (advogados, dentistas, energia solar, corretores) que fazem anúncios mandando pro WhatsApp.',
      'Abertura: "Oi [Nome], vi o anúncio de vocês rodando. A campanha tá convertendo legal ou tá vindo muito curioso solto no WhatsApp?"',
      'Transição: "Quando você manda do anúncio direto pro WhatsApp, perde a filtragem. Uma Landing Page intermediária dobra a qualidade do lead e do cliente final."',
      'Fechamento: "Por R$ 499 a gente coloca uma página profissional sua no ar em 48 horas."'
    ]
  }
]

const followUp = [
  { day: 'Dia 0', action: 'Reunião / Proposta enviada', type: 'neutral' },
  { day: 'Dia 1', action: 'WhatsApp: "Conseguiu ver? Ficou alguma dúvida?"', type: 'positive' },
  { day: 'Dia 3', action: 'Ligação ou áudio rápido', type: 'positive' },
  { day: 'Dia 5', action: 'Envio de um case de sucesso relacionado', type: 'positive' },
  { day: 'Dia 7', action: '"Ainda faz sentido pra você avançar?"', type: 'positive' },
  { day: 'Dia 10', action: 'Última tentativa — "Vou liberar seu espaço pra outro cliente."', type: 'warning' },
  { day: 'Dia 14+', action: 'Mover para "Perdido" no CRM, adicionar ao fluxo de nutrição', type: 'danger' },
]

const principles = [
  { icon: '🛡️', title: 'Evite Banimentos (Cold Outbound)', desc: 'Leads de API Google são frios. Dispare envios espaçados e varíe as mensagens iniciais.' },
  { icon: '🧲', title: 'Munição Controlada', desc: 'Nunca jogue PDF na primeira mensagem. O material só entra DEPOIS de confirmar a dor.' },
  { icon: '🎯', title: 'Venda é servir', desc: 'Você não está convencendo, está ajudando a resolver um problema real.' },
  { icon: '🗣️', title: 'Pergunte mais, fale menos', desc: 'A pessoa que mais pergunta, mais vende. Regra absoluta.' },
  { icon: '📵', title: 'Nunca negocie por WhatsApp', desc: 'Negociação séria = voz ou vídeo. WhatsApp é só para agendar.' },
  { icon: '📞', title: 'Quem não acompanha, não fecha', desc: 'Follow-up é respeito, não chatura. O cliente espera que você persista.' },
  { icon: '💡', title: 'Objeção = pergunta de volta', desc: 'Responder defende. Perguntar avança. Sempre devolva com uma pergunta.' },
  { icon: '💰', title: 'Preço sem valor = caro', desc: 'Nunca mande preço sem contexto. O valor percebido vem antes do número.' },
  { icon: '📊', title: 'CRM sempre atualizado', desc: 'Se não está no sistema, não aconteceu. É a memória da empresa.' },
]

const colorMap: Record<string, { bg: string, border: string, text: string, badge: string }> = {
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ManualPage() {
  const [expandedTripwire, setExpandedTripwire] = useState<string | null>(null);

  return (
    <div className="p-6 min-h-screen max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#f1f1f5]">Manual Comercial</h1>
            <p className="text-sm text-[#6b6b8a]">Playbook de Vendas — Uso Interno</p>
          </div>
        </div>

        {/* Fluxo Visual */}
        <div className="glass-card p-5 mt-6">
          <p className="text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider mb-4">Funil de Vendas</p>
          <div className="flex items-center gap-2 flex-wrap">
            {['WhatsApp', 'Qualificação', 'Diagnóstico', 'Proposta', 'Negociação', 'Fechamento', 'Onboarding'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-[#1e1e2e] text-xs font-medium text-[#f1f1f5] border border-[#2a2a3e]">
                  {step}
                </span>
                {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[#4b4b6a] flex-shrink-0" />}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-xs text-rose-300 font-medium">
              ❌ Nunca faça: Mandar portfólio, preço ou site de exemplo no primeiro contato.
            </p>
          </div>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-6">
        {phases.map((phase) => {
          const Icon = phase.icon
          const colors = colorMap[phase.color]
          return (
            <div key={phase.id} className={`glass-card border ${colors.border} overflow-hidden`}>
              {/* Phase Header */}
              <div className={`px-6 py-4 border-b border-[#1e1e2e] flex items-start gap-4 ${colors.bg}`}>
                <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>FASE {phase.id}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#f1f1f5]">{phase.title}</h2>
                  <p className={`text-xs mt-0.5 ${colors.text} font-medium`}>{phase.subtitle}</p>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-[#a1a1c2] mb-5">{phase.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {/* Faça */}
                  <div>
                    <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Faça
                    </p>
                    <ul className="space-y-1.5">
                      {phase.dos.map((d, i) => (
                        <li key={i} className="text-xs text-[#a1a1c2] flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Não Faça */}
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Não Faça
                    </p>
                    <ul className="space-y-1.5">
                      {phase.donts.map((d, i) => (
                        <li key={i} className="text-xs text-[#a1a1c2] flex items-start gap-2">
                          <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Scripts */}
                <div>
                  <p className="text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Scripts Prontos
                  </p>
                  <div className="space-y-2">
                    {phase.scripts.map((s, i) => (
                      <div key={i} className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl p-4">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${colors.text}`}>{s.label}</p>
                        <p className="text-sm text-[#e1e1e6] leading-relaxed italic">
                          &ldquo;{s.text}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tripwires (Ofertas Isca) */}
      <div className="mt-10 mb-2">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-[#f1f1f5]">Matriz de Ofertas Isca (Tripwires)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tripwires.map((t) => (
            <div 
              key={t.id} 
              onClick={() => setExpandedTripwire(expandedTripwire === t.id ? null : t.id)}
              className={`glass-card p-5 border transition-all cursor-pointer ${
                expandedTripwire === t.id 
                  ? 'border-indigo-500/60 bg-indigo-500/10' 
                  : 'border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/5'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-[#f1f1f5]">{t.niche}</h3>
                <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md whitespace-nowrap">{t.price}</span>
              </div>
              <p className="text-xs text-indigo-300 font-semibold mb-3 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Oferta: {t.offer}
              </p>
              <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 relative">
                <span className="absolute -top-2 left-2 bg-[#0a0a0f] px-1 text-[10px] text-[#6b6b8a] uppercase font-bold">O Pitch</span>
                <p className="text-xs text-[#a1a1c2] italic mt-1">&ldquo;{t.pitch}&rdquo;</p>
              </div>

              {expandedTripwire === t.id && (
                <div className="mt-5 pt-4 border-t border-indigo-500/20 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs text-[#a1a1c2] leading-relaxed mb-4">{t.details}</p>
                  <p className="text-xs font-bold text-[#f1f1f5] mb-2 uppercase tracking-wider flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-indigo-400" /> Passo a Passo da Prospecção:
                  </p>
                  <ul className="space-y-2">
                    {t.methods.map((method, idx) => (
                      <li key={idx} className="text-xs text-[#a1a1c2] flex items-start gap-2">
                        <span className="text-indigo-400 font-bold mt-0.5">{idx + 1}.</span> {method}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Objeções Rápidas */}
      <div className="mt-10 glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e1e2e] flex items-center gap-3 bg-rose-500/5">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <div>
            <h2 className="text-base font-bold text-[#f1f1f5]">Guia Rápido de Objeções</h2>
            <p className="text-xs text-rose-400">Consulte durante a negociação</p>
          </div>
        </div>
        <div className="divide-y divide-[#1e1e2e]">
          {objections.map((o, i) => (
            <div key={i} className="px-6 py-4 hover:bg-[#1e1e2e]/30 transition-colors">
              <p className="text-sm font-semibold text-[#f1f1f5] mb-1.5">{o.obj}</p>
              <p className="text-sm text-[#a1a1c2] italic">{o.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up */}
      <div className="mt-8 glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e1e2e] flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-base font-bold text-[#f1f1f5]">Cadência de Follow-up</h2>
            <p className="text-xs text-[#6b6b8a]">14 dias de acompanhamento estruturado</p>
          </div>
        </div>
        <div className="p-6">
          <div className="relative pl-6 border-l-2 border-[#1e1e2e] space-y-4">
            {followUp.map((f, i) => {
              const dotColor = f.type === 'danger' ? 'bg-red-500' : f.type === 'warning' ? 'bg-amber-500' : f.type === 'positive' ? 'bg-indigo-500' : 'bg-[#4b4b6a]'
              const textColor = f.type === 'danger' ? 'text-red-400' : f.type === 'warning' ? 'text-amber-400' : 'text-[#a1a1c2]'
              return (
                <div key={i} className="relative flex items-start gap-4">
                  <div className={`absolute -left-[28px] top-1 w-3 h-3 rounded-full ${dotColor} border-2 border-[#0a0a0f]`} />
                  <span className="text-xs font-bold text-[#f1f1f5] w-16 flex-shrink-0 mt-0.5">{f.day}</span>
                  <span className={`text-sm ${textColor}`}>{f.action}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Princípios */}
      <div className="mt-8 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-[#f1f1f5]">Princípios Fundamentais</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {principles.map((p, i) => (
            <div key={i} className="glass-card p-4 hover:border-amber-500/20 transition-all">
              <div className="text-2xl mb-2">{p.icon}</div>
              <h3 className="text-sm font-bold text-[#f1f1f5] mb-1">{p.title}</h3>
              <p className="text-xs text-[#6b6b8a] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
