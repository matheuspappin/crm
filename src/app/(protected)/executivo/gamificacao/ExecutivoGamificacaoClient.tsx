"use client";

import React, { useState } from "react";
import { GamificationManager, GamificationGoal } from "@/components/admin/GamificationManager";
import { TeamPerformanceBoard, TeamProgress } from "@/components/admin/TeamPerformanceBoard";
import { createClient } from "@/lib/supabase/client";

interface Props {
  initialGoals: GamificationGoal[];
  teamProgress: TeamProgress[];
}

export function ExecutivoGamificacaoClient({ initialGoals, teamProgress }: Props) {
  const [goals, setGoals] = useState<GamificationGoal[]>(initialGoals);
  const supabase = createClient();

  const handleToggle = async (id: string, active: boolean) => {
    // Optimistic update
    setGoals(goals.map(g => g.id === id ? { ...g, is_active: active } : g));
    const { error } = await (supabase.from('gamification_goals') as any).update({ is_active: active }).eq('id', id);
    if (error) {
      alert("Erro ao atualizar status da meta.");
    }
  };

  const handleDelete = async (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    const { error } = await (supabase.from('gamification_goals') as any).delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir meta.");
    }
  };

  const handleAddGoal = async (g: Omit<GamificationGoal, 'id' | 'is_active'>) => {
    const { data, error } = await (supabase.from('gamification_goals') as any).insert({
      title: g.title,
      description: g.description,
      period: g.period,
      metric: g.metric,
      target_value: g.target_value,
      xp_reward: g.xp_reward,
      is_active: true
    }).select().single();

    if (error) {
      alert("Erro ao criar meta.");
    } else if (data) {
      setGoals([...goals, data as GamificationGoal]);
    }
  };

  return (
    <div className="p-6 min-h-screen space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gamificação e Performance</h1>
        <p className="text-xs text-muted-foreground">Gerencie as metas da equipe e acompanhe os resultados em tempo real.</p>
      </div>

      <TeamPerformanceBoard progressData={teamProgress} />
      
      <GamificationManager 
        goals={goals}
        onAddGoal={handleAddGoal}
        onToggleStatus={handleToggle}
        onDeleteGoal={handleDelete}
      />
    </div>
  );
}
