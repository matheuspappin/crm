"use client";

import React from "react";
import { CheckCircle2, Circle, Flame, Target } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type QuestStatus = {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  xpReward: number;
  isCompleted: boolean;
};

interface DailyQuestsWidgetProps {
  quests: QuestStatus[];
  title?: string;
}

export function DailyQuestsWidget({ quests, title = "Missões Diárias" }: DailyQuestsWidgetProps) {
  const completedCount = quests.filter((q) => q.isCompleted).length;
  const allCompleted = quests.length > 0 && completedCount === quests.length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold">
          <Target className="text-emerald-500" size={20} />
          <h2>{title}</h2>
        </div>
        <div className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
          {completedCount} / {quests.length} Concluídas
        </div>
      </div>

      {allCompleted && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-3">
          <Flame className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-emerald-100">
            <strong>Mandou bem!</strong> Você completou todas as missões do dia. Continue assim amanhã!
          </div>
        </div>
      )}

      <div className="space-y-3">
        {quests.length === 0 ? (
          <div className="text-center text-sm text-zinc-500 py-4">Nenhuma missão disponível no momento.</div>
        ) : (
          quests.map((quest) => {
            const progress = Math.min(100, Math.max(0, (quest.currentValue / quest.targetValue) * 100));

            return (
              <div 
                key={quest.id} 
                className={cn(
                  "p-3 rounded-lg border flex flex-col gap-2 transition-colors",
                  quest.isCompleted 
                    ? "bg-emerald-950/20 border-emerald-900/50" 
                    : "bg-zinc-800/50 border-zinc-700/50"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    {quest.isCompleted ? (
                      <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                    ) : (
                      <Circle className="text-zinc-500 shrink-0 mt-0.5" size={16} />
                    )}
                    <div>
                      <span className={cn(
                        "text-sm font-medium",
                        quest.isCompleted ? "text-emerald-400 line-through opacity-70" : "text-zinc-200"
                      )}>
                        {quest.title}
                      </span>
                      <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                        Recompensa: +{quest.xpReward} XP
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-zinc-300 whitespace-nowrap">
                    {quest.currentValue} / {quest.targetValue}
                  </div>
                </div>

                {/* Micro Progress Bar */}
                {!quest.isCompleted && (
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700 ease-in-out" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
