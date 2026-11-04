import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { calendarDay } from "../gamification/rules";
import { cellRows, conditions, heatmap, type Filters } from "./metrics-core";

export { heatmap, MIN_ATTEMPTS, THRESHOLDS, type Filters } from "./metrics-core";

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
const round1 = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

export async function overview(f: Filters) {
  const playerWhere: Prisma.UserWhereInput = { role: { name: { not: "SECOPS" } }, ...(f.departmentId ? { departmentId: f.departmentId } : {}) };
  const since = new Date(Date.now() - 7 * 86_400_000);
  const yesterday = new Date(`${calendarDay(new Date(Date.now() - 86_400_000))}T00:00:00Z`);

  const [total, active, streakers, shield, cells, mttd] = await Promise.all([
    prisma.user.count({ where: playerWhere }),
    prisma.attempt.groupBy({ by: ["userId"], where: { isSuccessful: true, phase: "PRACTICE", createdAt: { gte: since }, user: playerWhere } }),
    // Racha vigente: ≥7 días y actividad ayer u hoy (una racha que no se continuó ya se perdió).
    prisma.user.count({ where: { ...playerWhere, currentStreak: { gte: 7 }, lastActivityDate: { gte: yesterday } } }),
    prisma.user.aggregate({ where: playerWhere, _avg: { shieldIntegrity: true } }),
    cellRows(f),
    // MTTD humano: segundos promedio hasta resolver correctamente un correo de phishing.
    prisma.$queryRaw<{ mttd: number | null }[]>(Prisma.sql`
      SELECT AVG(a.time_taken_seconds)::float AS mttd
      FROM attempts a
      JOIN users u ON u.id = a.user_id
      JOIN roles r ON r.id = u.role_id
      JOIN challenges ch ON ch.id = a.challenge_id
      WHERE a.is_successful AND ch.payload_config->>'type' = 'phishing' AND ${conditions(f)}`),
  ]);

  const attempts = cells.reduce((s, r) => s + r.attempts, 0);
  const failures = cells.reduce((s, r) => s + r.failures, 0);
  return {
    players: total,
    adoption: { activeLast7Days: active.length, rate: pct(active.length, total) },
    streakAdherence: { users: streakers, rate: pct(streakers, total) },
    mttdSeconds: round1(mttd[0]?.mttd),
    averageShield: round1(shield._avg.shieldIntegrity === null ? null : shield._avg.shieldIntegrity / 20), // en capas (0-5)
    attempts,
    failureRate: pct(failures, attempts),
  };
}

export async function exportRows(f: Filters) {
  const [{ departments, categories, cells }, rows] = await Promise.all([heatmap(f), cellRows(f)]);
  const dName = new Map(departments.map((d) => [d.id, d.name]));
  const cName = new Map(categories.map((c) => [c.id, c.name]));
  const avg = new Map(rows.map((r) => [`${r.department_id}|${r.category_id}`, r.avg_time]));
  return cells
    .filter((c) => c.attempts > 0)
    .map((c) => ({
      departamento: dName.get(c.departmentId) ?? "",
      categoria: cName.get(c.categoryId) ?? "",
      intentos: c.attempts,
      fallos: c.failures,
      tasa_de_fallo_pct: c.rate, // null por debajo del mínimo de intentos
      tiempo_promedio_s: round1(avg.get(`${c.departmentId}|${c.categoryId}`)),
    }));
}

/** Un valor de CSV: se escapa y se neutraliza la inyección de fórmulas (=, +, -, @) al abrirlo en una hoja de cálculo. */
export function csvCell(v: string | number | null): string {
  if (v === null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+@\t\r-]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows: Awaited<ReturnType<typeof exportRows>>): string {
  const header = ["Departamento", "Categoría", "Intentos", "Fallos", "Tasa de fallo (%)", "Tiempo promedio (s)"];
  const lines = rows.map((r) => [r.departamento, r.categoria, r.intentos, r.fallos, r.tasa_de_fallo_pct, r.tiempo_promedio_s].map(csvCell).join(","));
  return "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n"; // BOM para que Excel respete los acentos
}
