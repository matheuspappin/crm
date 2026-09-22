import { createClient } from "@/lib/supabase/server";
import { ExecutivoGamificacaoClient } from "./ExecutivoGamificacaoClient";
import type { TeamProgress } from "@/components/admin/TeamPerformanceBoard";
import type { GamificationGoal } from "@/components/admin/GamificationManager";

export const dynamic = 'force-dynamic';

export default async function ExecutivoGamificacaoPage() {
  const supabase = await createClient();

  // 1. Fetch Goals
  const { data: goalsData } = await supabase.from('gamification_goals').select('*').order('created_at');
  const goals = (goalsData || []) as GamificationGoal[];
  const activeGoals = goals.filter(g => g.is_active);

  // 2. Fetch Users (vendedores)
  const { data: usersData } = await supabase.from('users').select('id, name').eq('role', 'vendas');
  const users = (usersData || []) as any[];

  // 3. Fetch current progress
  const today = new Date().toISOString().split('T')[0];
  const { data: progressRows } = await supabase
    .from('user_goal_progress')
    .select('*')
    .lte('period_start', today)
    .gte('period_end', today);

  const pRows = (progressRows || []) as any[];

  // 4. Map into TeamProgress
  const teamProgress: TeamProgress[] = users.map(user => {
    const userGoals = activeGoals.map(goal => {
      const pRow = pRows.find(p => p.user_id === user.id && p.goal_id === goal.id);
      return {
        goal_id: goal.id,
        goal_title: goal.title,
        current_value: pRow ? Number(pRow.current_value) : 0,
        target_value: Number(goal.target_value),
        is_completed: pRow ? pRow.is_completed : false,
      };
    });

    return {
      user_id: user.id,
      user_name: user.name,
      goals: userGoals
    };
  });

  return (
    <ExecutivoGamificacaoClient initialGoals={goals} teamProgress={teamProgress} />
  );
}
