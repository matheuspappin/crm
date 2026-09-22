import React from "react";
import { UserLevelBar } from "@/components/gamification/UserLevelBar";
import { DailyQuestsWidget, QuestStatus } from "@/components/gamification/DailyQuestsWidget";
import { Leaderboard, LeaderboardUser } from "@/components/gamification/Leaderboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function VendasGamificationPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  // 1. Current User Profile
  const { data: userProfile } = await (supabase
    .from('users')
    .select('name')
    .eq('id', authUser.id)
    .single() as any);

  const { data: gamificationProfile } = await (supabase
    .from('gamification_profiles')
    .select('xp, level')
    .eq('user_id', authUser.id)
    .single() as any);

  const currentUserLevel = {
    name: userProfile?.name || "Usuário",
    xp: gamificationProfile?.xp || 0,
    level: gamificationProfile?.level || 1,
  };

  // 2. Daily Quests (Daily Goals Progress)
  const today = new Date().toISOString().split('T')[0];
  const { data: activeDailyGoals } = await (supabase
    .from('gamification_goals')
    .select('*')
    .eq('is_active', true)
    .eq('period', 'daily') as any);

  const { data: progressRows } = await supabase
    .from('user_goal_progress')
    .select('*')
    .eq('user_id', authUser.id)
    .lte('period_start', today)
    .gte('period_end', today);

  const pRows = (progressRows || []) as any[];
  const dailyQuests: QuestStatus[] = ((activeDailyGoals || []) as any[]).map(goal => {
    const pRow = pRows.find(p => p.goal_id === goal.id);
    return {
      id: goal.id,
      title: goal.title,
      currentValue: pRow ? Number(pRow.current_value) : 0,
      targetValue: Number(goal.target_value),
      xpReward: goal.xp_reward,
      isCompleted: pRow ? pRow.is_completed : false,
    };
  });

  // 3. Leaderboard
  const { data: leaderboardDataRaw } = await supabase
    .from('gamification_profiles')
    .select('user_id, xp, level, users!inner(name)')
    .order('xp', { ascending: false })
    .limit(10);

  const leaderboardData: LeaderboardUser[] = (leaderboardDataRaw || []).map((row: any) => ({
    id: row.user_id,
    name: row.users.name,
    xp: row.xp,
    level: row.level,
  }));

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Meu Perfil e Metas</h1>
        <p className="text-xs text-muted-foreground">Acompanhe seu desempenho e conquiste níveis!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UserLevelBar 
            name={currentUserLevel.name}
            xp={currentUserLevel.xp}
            level={currentUserLevel.level}
          />
          <DailyQuestsWidget quests={dailyQuests} />
        </div>
        
        <div className="lg:col-span-1">
          <Leaderboard 
            users={leaderboardData} 
            currentUserId={authUser.id}
            title="Ranking da Equipe (Global)"
          />
        </div>
      </div>
    </div>
  );
}
