"use client";

import React from "react";
import { Trophy, Medal } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type LeaderboardUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  xp: number;
  level: number;
};

interface LeaderboardProps {
  users: LeaderboardUser[];
  currentUserId?: string;
  title?: string;
}

export function Leaderboard({ users, currentUserId, title = "Top Performers" }: LeaderboardProps) {
  // Sort users by XP descending
  const sortedUsers = [...users].sort((a, b) => b.xp - a.xp);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full">
      <div className="flex items-center gap-2 text-zinc-100 font-semibold mb-5">
        <Trophy className="text-yellow-500" size={20} />
        <h2>{title}</h2>
      </div>

      <div className="flex flex-col gap-1">
        {sortedUsers.map((user, index) => {
          const isCurrentUser = user.id === currentUserId;
          const isTop3 = index < 3;
          
          return (
            <div 
              key={user.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-colors",
                isCurrentUser ? "bg-zinc-800 border border-zinc-700" : "hover:bg-zinc-800/50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center text-sm font-bold">
                  {index === 0 && <Medal className="text-yellow-400" size={18} />}
                  {index === 1 && <Medal className="text-zinc-400" size={18} />}
                  {index === 2 && <Medal className="text-amber-600" size={18} />}
                  {!isTop3 && <span className="text-zinc-500">{index + 1}</span>}
                </div>
                
                <div className="relative">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-zinc-700">
                    {user.level}
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrentUser ? "text-emerald-400" : "text-zinc-200"
                  )}>
                    {user.name}
                    {isCurrentUser && <span className="ml-2 text-[10px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">Você</span>}
                  </span>
                  <span className="text-xs text-zinc-500">{user.xp} XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
