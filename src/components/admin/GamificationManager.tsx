"use client";

import React, { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";

export type GamificationGoal = {
  id: string;
  title: string;
  description: string;
  period: "daily" | "weekly" | "monthly";
  metric: "calls_made" | "meetings_booked" | "deals_closed" | "revenue_generated" | "leads_contacted";
  target_value: number;
  xp_reward: number;
  is_active: boolean;
};

interface GamificationManagerProps {
  goals: GamificationGoal[];
  onAddGoal: (goal: Omit<GamificationGoal, "id">) => void;
  onToggleStatus: (id: string, active: boolean) => void;
  onDeleteGoal: (id: string) => void;
}

export function GamificationManager({ goals, onAddGoal, onToggleStatus, onDeleteGoal }: GamificationManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<GamificationGoal>>({
    title: "",
    description: "",
    period: "daily",
    metric: "calls_made",
    target_value: 1,
    xp_reward: 50,
  });

  const handleSave = () => {
    if (!newGoal.title || !newGoal.description || !newGoal.target_value || !newGoal.xp_reward) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    onAddGoal(newGoal as Omit<GamificationGoal, "id">);
    setIsAdding(false);
    setNewGoal({
      title: "",
      description: "",
      period: "daily",
      metric: "calls_made",
      target_value: 1,
      xp_reward: 50,
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Target className="text-emerald-500" />
            Gestão de Metas e XP
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Defina missões diárias, semanais e mensais para engajar a equipe.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Nova Meta
        </button>
      </div>

      {isAdding && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <h3 className="text-zinc-100 font-semibold mb-4">Criar Nova Meta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">Título da Meta</label>
              <input 
                type="text" 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ex: Ligações do Dia"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">Período</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                value={newGoal.period}
                onChange={(e) => setNewGoal({...newGoal, period: e.target.value as any})}
              >
                <option value="daily">Diário (Daily)</option>
                <option value="weekly">Semanal (Weekly)</option>
                <option value="monthly">Mensal (Monthly)</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-zinc-400">Descrição</label>
              <input 
                type="text" 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="O que o vendedor deve fazer para ganhar?"
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">Métrica Alvo</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                value={newGoal.metric}
                onChange={(e) => setNewGoal({...newGoal, metric: e.target.value as any})}
              >
                <option value="calls_made">Ligações Feitas</option>
                <option value="meetings_booked">Reuniões Agendadas</option>
                <option value="deals_closed">Contratos Fechados</option>
                <option value="revenue_generated">Receita Gerada (R$)</option>
                <option value="leads_contacted">Leads Contatados</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Quantidade/Alvo</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({...newGoal, target_value: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Recompensa (XP)</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={newGoal.xp_reward}
                  onChange={(e) => setNewGoal({...newGoal, xp_reward: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button 
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Salvar Meta
            </button>
            <button 
              onClick={() => setIsAdding(false)} 
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => (
          <div key={goal.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-zinc-100 font-semibold">{goal.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  goal.period === 'daily' ? 'bg-blue-500/20 text-blue-400' : 
                  goal.period === 'weekly' ? 'bg-purple-500/20 text-purple-400' : 
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {goal.period}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mb-4">{goal.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-zinc-950 p-2 rounded-lg mb-4">
                <div>
                  <span className="text-zinc-500 block">Métrica:</span>
                  <span className="font-medium">{goal.metric.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Alvo:</span>
                  <span className="font-medium">{goal.target_value}</span>
                </div>
                <div className="col-span-2 mt-1">
                  <span className="text-zinc-500 block">Recompensa:</span>
                  <span className="font-bold text-yellow-500">+{goal.xp_reward} XP</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={goal.is_active}
                    onChange={(e) => onToggleStatus(goal.id, e.target.checked)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${goal.is_active ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${goal.is_active ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-xs font-medium text-zinc-400">{goal.is_active ? 'Ativa' : 'Inativa'}</span>
              </label>
              
              <button 
                onClick={() => onDeleteGoal(goal.id)}
                className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                title="Excluir meta"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
