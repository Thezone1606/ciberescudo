// Cálculos puros del reporte del piloto (sin base de datos): se prueban por separado.

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function mean(values: number[]): number | null {
  return values.length ? round1(values.reduce((s, v) => s + v, 0) / values.length) : null;
}

export function ratePct(successes: number, attempts: number): number | null {
  return attempts ? round1((successes / attempts) * 100) : null;
}

/**
 * Variación porcentual (final − inicial) / inicial × 100 (fórmula de Notion). Nula si no hay base de
 * comparación (inicial 0 o ausente), porque dividir entre cero no significa nada.
 */
export function deltaPct(initial: number | null, final: number | null): number | null {
  if (initial === null || final === null || initial === 0) return null;
  return round1(((final - initial) / initial) * 100);
}

/** Días consecutivos más largos dentro de un conjunto de fechas «AAAA-MM-DD» (se ignoran los repetidos). */
export function longestRun(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = Date.parse(`${d}T00:00:00Z`) / 86_400_000;
    run = prev !== null && t - prev === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round1(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}
