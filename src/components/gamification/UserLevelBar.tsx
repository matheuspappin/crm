"use client";

import React from "react";
import { User, Zap, Trophy } from "lucide-react";

interface UserLevelBarProps {
  xp: number;
  level: number;
  name: string;
  avatarUrl?: string | null;
}

export function UserLevelBar({ xp, level, name, avatarUrl }: UserLevelBarProps) {
  // Simple calculation for next level (e.g. each level needs 1000 xp)
  const xpForNextLevel = level * 1000;
  const currentLevelXp = xp % 1000; // XP gained in the current level
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXp / 1000) * 100));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 w-full max-w-sm">
      {/* Avatar / Level Badge */}
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
            <User size={24} />
          </div>
        )}
        <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-zinc-900">
          {level}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-zinc-100 font-semibold truncate">{name}</h3>
          <div className="flex items-center text-yellow-500 text-sm font-medium gap-1">
            <Zap size={14} className="fill-yellow-500" />
            {xp} XP
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1 text-[10px] text-zinc-500 font-medium">
          <span>Nv. {level}</span>
          <span>{currentLevelXp} / 1000 para Nv. {level + 1}</span>
        </div>
      </div>
    </div>
  );
}
