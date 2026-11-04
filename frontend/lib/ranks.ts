// Rangos de Notion (Recluta → Guardián Forense). Los umbrales de XP no estaban definidos:
// están calibrados para que el último rango sea alcanzable con los 20 retos del MVP.
export const RANKS = [
  { name: "Recluta", min: 0 },
  { name: "Centinela", min: 50 },
  { name: "Defensor", min: 150 },
  { name: "Especialista SOC", min: 300 },
  { name: "Guardián Forense", min: 450 },
] as const;

export function rankFor(xp: number) {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.min) index = i;
  });
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  return {
    current,
    next,
    progress: next ? Math.min(1, (xp - current.min) / span) : 1,
    toNext: next ? next.min - xp : 0,
  };
}

/** Multiplicador de XP por racha (mismas reglas del backend). */
export function streakMultiplier(streak: number) {
  if (streak >= 30) return 1.5;
  if (streak >= 7) return 1.2;
  return 1;
}

/** Siguiente umbral de racha que mejora el multiplicador. */
export function nextStreakMilestone(streak: number) {
  if (streak < 7) return { days: 7, multiplier: 1.2 };
  if (streak < 30) return { days: 30, multiplier: 1.5 };
  return null;
}
