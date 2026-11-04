import { nextStreakMilestone, rankFor } from "@/lib/ranks";
import type { Profile } from "@/lib/types";

/** Qué falta para el siguiente rango y para mejorar el multiplicador de la racha. */
export function RankPanel({ user }: { user: Profile }) {
  const rank = rankFor(user.currentXp);
  const milestone = nextStreakMilestone(user.currentStreak);
  const pct = Math.round(rank.progress * 100);

  return (
    <section aria-labelledby="rank-title">
      <h2 id="rank-title" className="text-base font-semibold">
        {rank.current.name}
      </h2>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={rank.next ? `Progreso hacia ${rank.next.name}` : "Rango máximo alcanzado"}
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full origin-left rounded-full bg-cyan transition-transform duration-500 ease-[var(--ease-out)]"
          style={{ transform: `scaleX(${rank.progress})` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        {rank.next ? (
          <>
            Te faltan <span className="font-mono text-text">{rank.toNext} XP</span> para ser {rank.next.name}.
          </>
        ) : (
          "Alcanzaste el rango máximo."
        )}
      </p>

      <p className="mt-4 text-sm text-muted">
        {user.currentStreak === 0
          ? "Resuelve un reto hoy para iniciar tu racha."
          : milestone
            ? `Llevas ${user.currentStreak} ${user.currentStreak === 1 ? "día" : "días"} seguidos. A los ${milestone.days} días tus puntos valen ${milestone.multiplier}×.`
            : `Llevas ${user.currentStreak} días seguidos y tus puntos valen 1.5×.`}
      </p>
    </section>
  );
}
