'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, User, Phone, DollarSign, Tag, Building2, AlignLeft, UserCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Seller {
  id: string
  name: string
}

export function NewLeadButton({ sellers }: { sellers: Seller[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    value: '',
    utm_source: '',
    company_name: '',
    project_description: '',
    assigned_to: '',
    service_type: 'ambos'
  })

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await (supabase as any)
      .from('leads')
      .insert({
        name: formData.name,
        contact: formData.contact || null,
        company_name: formData.company_name || null,
        project_description: formData.project_description || null,
        assigned_to: formData.assigned_to || null,
        service_type: formData.service_type,
        value: Number(formData.value) || 0,
        utm_source: formData.utm_source || 'Orgânico / Direto',
        status: 'novo'
      })

    setLoading(false)

    if (!error) {
      setIsOpen(false)
      setFormData({ name: '', contact: '', value: '', utm_source: '', company_name: '', project_description: '', assigned_to: '', service_type: 'ambos' })
      router.refresh()
    } else {
      alert('Erro ao criar lead: ' + error.message)
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Novo Lead
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-foreground">Adicionar Novo Lead</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Nome do Contato *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Empresa / Negócio</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                        placeholder="Ex: Loja do João"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Contato (Email ou WhatsApp)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <input
                        type="text"
                        value={formData.contact}
                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                        placeholder="email@... ou (11) 9..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tipo de Serviço Negociado *</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <select
                        required
                        value={formData.service_type}
                        onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        <option value="ambos">Site + Tráfego (Ambos)</option>
                        <option value="dev">Apenas Site/Sistema</option>
                        <option value="trafego">Apenas Tráfego Pago</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Valor Estimado (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Responsável (Vendedor)</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        <option value="">-- Sem responsável --</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Origem do Lead</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4b6a]" />
                      <select
                        value={formData.utm_source}
                        onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground appearance-none"
                      >
                        <option value="">Orgânico / Direto</option>
                        <option value="Indicacao">Indicação</option>
                        <option value="Instagram">Instagram (Social)</option>
                        <option value="Prospeccao">Prospecção Ativa</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Descrição do Projeto</label>
                    <div className="relative">
                      <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-[#4b4b6a]" />
                      <textarea
                        value={formData.project_description}
                        onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground resize-none h-24"
                        placeholder="O que o cliente precisa? Site institucional, Landing Page, Tráfego..."
                      />
                    </div>
                  </div>
                </div>

              </div>
              <div className="pt-6 mt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={loading || !formData.name}
                  className="w-full bg-foreground hover:opacity-90 text-background font-medium py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Criar Lead no Funil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
