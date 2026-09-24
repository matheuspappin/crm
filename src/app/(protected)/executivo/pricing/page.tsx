"use client"

import React, { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  DollarSign,
  Settings,
  Tag,
  Archive,
  Activity,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ExecutivoTabs } from '@/components/executivo/ExecutivoTabs'

import type { Product, ProductCategory, PricingPlan } from '@/types/database'

interface ProductWithPlans extends Product {
  plans: PricingPlan[]
}

export default function AdminPricingPage() {
  const [products, setProducts] = useState<ProductWithPlans[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  // Forms state
  const [newProduct, setNewProduct] = useState({ name: '', description: '', category: 'service' as ProductCategory })
  const [newPlan, setNewPlan] = useState({ name: '', setup_fee: 0, monthly_fee: 0, internal_cost: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        plans:pricing_plans(*)
      `)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data as ProductWithPlans[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('products').insert([newProduct] as any)
    
    if (error) {
      alert('Erro ao criar produto: ' + error.message)
    } else {
      setIsProductModalOpen(false)
      setNewProduct({ name: '', description: '', category: 'service' })
      fetchProducts()
    }
    setIsSubmitting(false)
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId) return
    setIsSubmitting(true)
    
    const { error } = await supabase.from('pricing_plans').insert([{ 
      ...newPlan, 
      product_id: selectedProductId 
    }] as any)
    
    if (error) {
      alert('Erro ao criar plano: ' + error.message)
    } else {
      setIsPlanModalOpen(false)
      setNewPlan({ name: '', setup_fee: 0, monthly_fee: 0, internal_cost: 0 })
      fetchProducts()
    }
    setIsSubmitting(false)
  }

  const openPlanModal = (productId: string) => {
    setSelectedProductId(productId)
    setIsPlanModalOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const getCategoryBadge = (category: ProductCategory) => {
    const map = {
      tripwire: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Oferta Isca' },
      saas: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', label: 'SaaS' },
      service: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Serviço' },
      hardware: { bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Hardware' }
    }
    const style = map[category]
    return (
      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    )
  }

  // Calculate generic KPIs based on active plans
  const totalProducts = products.length
  let mrrPotential = 0
  let totalCost = 0
  
  products.forEach(p => {
    if (p.plans && p.plans.length > 0) {
      // Pick the first plan as an example for potential calculations
      mrrPotential += Number(p.plans[0].monthly_fee) || 0
      totalCost += Number(p.plans[0].internal_cost) || 0
    }
  })

  return (
    <div className="p-6 min-h-screen max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#f1f1f5]">Produtos & Preços</h1>
            <p className="text-sm text-[#6b6b8a]">Gerencie o catálogo de ofertas e calcule o MRR Líquido</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsProductModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Navegação Executiva */}
      <ExecutivoTabs activeTab="pricing" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 border border-[#1e1e2e]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-[#6b6b8a]">MRR Base</h3>
          </div>
          <p className="text-2xl font-bold text-[#f1f1f5]">{formatCurrency(mrrPotential)} <span className="text-xs text-[#4b4b6a] font-normal">/cliente (média)</span></p>
        </div>
        <div className="glass-card p-5 border border-[#1e1e2e]">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-[#6b6b8a]">Custo Interno Base</h3>
          </div>
          <p className="text-2xl font-bold text-[#f1f1f5]">{formatCurrency(totalCost)} <span className="text-xs text-[#4b4b6a] font-normal">/cliente (média)</span></p>
        </div>
        <div className="glass-card p-5 border border-[#1e1e2e]">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-[#6b6b8a]">Produtos Ativos</h3>
          </div>
          <p className="text-2xl font-bold text-[#f1f1f5]">{totalProducts}</p>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-6">
        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-20 bg-[#1e1e2e] rounded w-full"></div>
              <div className="h-20 bg-[#1e1e2e] rounded w-full"></div>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card p-10 flex flex-col items-center justify-center border-dashed border-[#2a2a3e] text-center">
             <Package className="w-12 h-12 text-[#4b4b6a] mb-4" />
             <h3 className="text-lg font-bold text-[#f1f1f5] mb-2">Nenhum produto cadastrado</h3>
             <p className="text-[#6b6b8a] mb-6 max-w-md">Você ainda não possui produtos ou ofertas no seu catálogo. Cadastre o primeiro produto para começar a montar propostas.</p>
             <button onClick={() => setIsProductModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
               Criar Produto
             </button>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="glass-card border border-[#1e1e2e] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1e1e2e] bg-[#0a0a0f]/50 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-bold text-[#f1f1f5]">{product.name}</h2>
                    {getCategoryBadge(product.category)}
                    {!product.is_active && (
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#6b6b8a]">{product.description}</p>
                </div>
                <button className="p-2 hover:bg-[#1e1e2e] rounded-lg transition-colors text-[#6b6b8a] hover:text-[#f1f1f5]">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 bg-[#050508]">
                <h4 className="text-xs font-bold text-[#6b6b8a] uppercase tracking-wider mb-4">Planos de Precificação</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {product.plans?.map((plan) => (
                    <div key={plan.id} className="border border-[#1e1e2e] bg-[#0a0a0f] rounded-lg p-4 hover:border-indigo-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <h5 className="font-semibold text-[#f1f1f5]">{plan.name}</h5>
                        {!plan.is_active && <Archive className="w-4 h-4 text-red-400" />}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] text-[#6b6b8a] uppercase font-bold mb-1">Setup / Adesão</p>
                          <p className="font-mono text-sm text-[#f1f1f5]">{formatCurrency(plan.setup_fee)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#6b6b8a] uppercase font-bold mb-1">Mensalidade (MRR)</p>
                          <p className="font-mono text-sm text-emerald-400">{formatCurrency(plan.monthly_fee)}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#1e1e2e] flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-[#6b6b8a] uppercase font-bold mb-1">Custo Interno</p>
                          <p className="font-mono text-xs text-rose-400">{formatCurrency(plan.internal_cost)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#6b6b8a] uppercase font-bold mb-1">Lucro Líquido</p>
                          <p className="font-mono text-xs text-indigo-400 font-bold">{formatCurrency(plan.monthly_fee - plan.internal_cost)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Plan Button */}
                  <button 
                    onClick={() => openPlanModal(product.id)}
                    className="border border-dashed border-[#2a2a3e] bg-transparent rounded-lg p-4 flex flex-col items-center justify-center text-[#6b6b8a] hover:text-[#f1f1f5] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all min-h-[140px]"
                  >
                    <Plus className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">Adicionar Variante de Preço</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Novo Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-[#f1f1f5]">Novo Produto</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-[#6b6b8a] hover:text-[#f1f1f5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Nome do Produto</label>
                <input 
                  required
                  type="text" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Sistema QR Code"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Categoria</label>
                <select 
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value as ProductCategory})}
                  className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500"
                >
                  <option value="tripwire">Oferta Isca (Tripwire)</option>
                  <option value="saas">Assinatura (SaaS)</option>
                  <option value="service">Serviço Pontual</option>
                  <option value="hardware">Equipamento / Hardware</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Descrição</label>
                <textarea 
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500 h-24 resize-none"
                  placeholder="Descreva o produto brevemente..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#a1a1c2] hover:text-[#f1f1f5] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Plano de Preço */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-[#f1f1f5]">Nova Variante de Preço</h2>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-[#6b6b8a] hover:text-[#f1f1f5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Nome do Plano</label>
                <input 
                  required
                  type="text" 
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                  className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Setup Padrão, Plano Anual"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Setup / Adesão (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPlan.setup_fee}
                    onChange={(e) => setNewPlan({...newPlan, setup_fee: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Mensalidade (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPlan.monthly_fee}
                    onChange={(e) => setNewPlan({...newPlan, monthly_fee: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6b6b8a] uppercase mb-1">Custo Interno Mensal (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newPlan.internal_cost}
                  onChange={(e) => setNewPlan({...newPlan, internal_cost: parseFloat(e.target.value) || 0})}
                  className="w-full bg-[#050508] border border-[#1e1e2e] rounded-lg px-4 py-2 text-[#f1f1f5] focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="Custo do servidor, apis, etc."
                />
                <p className="text-[10px] text-[#6b6b8a] mt-1">Usado para calcular a margem de lucro líquido da agência.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#a1a1c2] hover:text-[#f1f1f5] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}


