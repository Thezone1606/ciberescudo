// Reglas de negocio de la gamificación (Semana 5-8, sección 5). Funciones puras:
// reciben el estado y la hora, devuelven el nuevo estado. No tocan la BD.

export const SHIELD_MAX = 100;
export const SHIELD_PENALTY = 20;
export const COOLDOWN_MS = 2 * 60 * 1000;
// La racha cuenta días calendario en la zona horaria de la empresa, no en UTC.
export const TIME_ZONE = "America/Mexico_City";

export interface GameState {
  xp: number;
  streak: number;
  shield: number;
  cooldownUntil: Date | null;
  lastActivityDay: string | null; // "YYYY-MM-DD"
}

/** Día calendario ("YYYY-MM-DD") de `now` en la zona horaria de la empresa. */
export function calendarDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Días calendario entre dos "YYYY-MM-DD" (to - from). */
export function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Racha tras un intento exitoso hoy.
 * - Sin actividad previa o con hueco de más de un día: vuelve a 1.
 * - Ayer: +1. Hoy (ya resolvió algo): se mantiene.
 */
export function nextStreak(current: number, lastDay: string | null, today: string): number {
  if (lastDay === null) return 1;
  const diff = dayDiff(lastDay, today);
  if (diff <= 0) return Math.max(current, 1);
  if (diff === 1) return current + 1;
  return 1;
}

/** Multiplicador de XP por racha: ≥30 días 1.5×, ≥7 días 1.2×. */
export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 7) return 1.2;
  return 1;
}

export function xpFor(baseXp: number, streak: number): number {
  return Math.round(baseXp * streakMultiplier(streak));
}

export function isInCooldown(cooldownUntil: Date | null, now: Date): boolean {
  return cooldownUntil !== null && cooldownUntil.getTime() > now.getTime();
}

/**
 * Si el escudo cayó a 0 y la ventana de 2 minutos ya pasó, el escudo se restaura.
 * (Notion pide el repaso teórico y la espera; no dice cómo se recarga, se restaura completo.)
 */
export function recoverShield(state: GameState, now: Date): GameState {
  if (state.shield === 0 && !isInCooldown(state.cooldownUntil, now)) {
    return { ...state, shield: SHIELD_MAX, cooldownUntil: null };
  }
  return state;
}

export interface AttemptOutcome {
  state: GameState;
  xpAwarded: number;
}

/**
 * Aplica el resultado de un intento. `firstSuccess` indica que es la primera vez que el usuario
 * acierta ese reto: repetirlo es práctica y no da XP (evita farmear puntos con un reto fácil).
 */
export function applyAttempt(
  state: GameState,
  result: { successful: boolean; baseXp: number; firstSuccess: boolean },
  now: Date,
): AttemptOutcome {
  if (!result.successful) {
    const shield = Math.max(0, state.shield - SHIELD_PENALTY);
    const cooldownUntil = shield === 0 ? new Date(now.getTime() + COOLDOWN_MS) : state.cooldownUntil;
    return { state: { ...state, shield, cooldownUntil }, xpAwarded: 0 };
  }
  const today = calendarDay(now);
  const streak = nextStreak(state.streak, state.lastActivityDay, today);
  const xpAwarded = result.firstSuccess ? xpFor(result.baseXp, streak) : 0;
  return {
    state: { ...state, streak, lastActivityDay: today, xp: state.xp + xpAwarded },
    xpAwarded,
  };
}

/** XP base por dificultad (Semana 5-8, sección 5). El panel de administración lo usa como valor por defecto. */
export const BASE_XP = { BASIC: 10, INTERMEDIATE: 25, ADVANCED: 50 } as const;
