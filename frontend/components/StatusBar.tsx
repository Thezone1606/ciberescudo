"use client";

import { Flame, Zap } from "lucide-react";
import { rankFor, streakMultiplier } from "@/lib/ranks";
import type { Profile } from "@/lib/types";
import { ShieldMeter } from "./ShieldMeter";

/** Estado de gamificación a simple vista: escudo, racha y XP con rango. */
export function StatusBar({ user }: { user: Profile }) {
  const rank = rankFor(user.currentXp);
  const multiplier = streakMultiplier(user.currentStreak);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:gap-x-5">
      <ShieldMeter value={user.shieldIntegrity} />

      <div
        className="flex items-center gap-1.5"
        role="img"
        aria-label={`Racha de ${user.currentStreak} ${user.currentStreak === 1 ? "día" : "días"}${multiplier > 1 ? `, puntos por ${multiplier}` : ""}`}
      >
        <Flame
          size={18}
          aria-hidden="true"
          className={user.currentStreak > 0 ? "text-warn" : "text-muted/70"}
          fill={user.currentStreak > 0 ? "currentColor" : "none"}
          fillOpacity={0.28}
        />
        <span className="font-mono" aria-hidden="true">
          {user.currentStreak}
          <span> {user.currentStreak === 1 ? "día" : "días"}</span>
        </span>
        {multiplier > 1 && (
          <span className="rounded bg-warn/15 px-1.5 py-0.5 font-mono text-xs text-warn" aria-hidden="true">
            ×{multiplier}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Zap size={18} aria-hidden="true" className="text-blue" fill="currentColor" fillOpacity={0.28} />
        <span className="font-mono">{user.currentXp} XP</span>
        <span className="text-muted">· {rank.current.name}</span>
      </div>
    </div>
  );
}
