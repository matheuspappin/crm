"use client";

import React from "react";
import { Users } from "lucide-react";

export type TeamProgress = {
  user_id: string;
  user_name: string;
  goals: {
    goal_id: string;
    goal_title: string;
    current_value: number;
    target_value: number;
    is_completed: boolean;
  }[];
};

interface TeamPerformanceBoardProps {
  progressData: TeamProgress[];
}

export function TeamPerformanceBoard({ progressData }: TeamPerformanceBoardProps) {
  if (!progressData || progressData.length === 0) {
    return <div className="text-zinc-500">Nenhum dado de performance disponível.</div>;
  }

  // Extract unique goals for table headers
  const uniqueGoals = Array.from(
    new Map(
      progressData.flatMap((user) => user.goals.map((g) => [g.goal_id, g]))
    ).values()
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full overflow-x-auto">
      <div className="flex items-center gap-2 text-zinc-100 font-semibold mb-5">
        <Users className="text-blue-500" size={20} />
        <h2>Acompanhamento da Equipe (Em Tempo Real)</h2>
      </div>

      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 rounded-tl-lg">Vendedor</th>
            {uniqueGoals.map(goal => (
              <th key={goal.goal_id} scope="col" className="px-4 py-3 text-center">
                {goal.goal_title}
                <div className="text-[9px] font-normal text-zinc-500 lowercase mt-0.5">Alvo: {goal.target_value}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {progressData.map((user, index) => (
            <tr key={user.user_id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/20">
              <td className="px-4 py-3 font-medium whitespace-nowrap">
                {user.user_name}
              </td>
              {uniqueGoals.map(goalHeader => {
                const userGoal = user.goals.find(g => g.goal_id === goalHeader.goal_id);
                
                if (!userGoal) return <td key={goalHeader.goal_id} className="px-4 py-3 text-center text-zinc-600">-</td>;

                const percentage = Math.min(100, (userGoal.current_value / userGoal.target_value) * 100);
                
                return (
                  <td key={goalHeader.goal_id} className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-semibold ${userGoal.is_completed ? 'text-emerald-500' : 'text-zinc-300'}`}>
                        {userGoal.current_value}
                      </span>
                      <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${userGoal.is_completed ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
