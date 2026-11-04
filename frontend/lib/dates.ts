// Días calendario en la zona horaria de la empresa (igual que el backend): la racha y los filtros
// del tablero cuentan en hora de Ciudad de México, no en la del navegador.
const TIME_ZONE = "America/Mexico_City";

export function calendarDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export type Period = "7" | "30" | "90" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "7", label: "Últimos 7 días" },
  { id: "30", label: "Últimos 30 días" },
  { id: "90", label: "Últimos 90 días" },
  { id: "all", label: "Todo el historial" },
];

/** Rango `from`/`to` (AAAA-MM-DD, inclusivos) para un periodo. */
export function periodRange(period: Period, now = new Date()): { from?: string; to?: string } {
  if (period === "all") return {};
  const days = Number(period);
  return { from: calendarDay(new Date(now.getTime() - (days - 1) * 86_400_000)), to: calendarDay(now) };
}
