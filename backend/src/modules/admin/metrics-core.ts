import { Prisma } from "@prisma/client";
import { prisma } from "../../db";

// Privacidad: las métricas son colectivas. Una celda (departamento × categoría) con pocos intentos
// podría señalar a una persona, así que por debajo de este mínimo no se calcula la tasa.
export const MIN_ATTEMPTS = 5;
export const THRESHOLDS = { green: 10, yellow: 25 }; // % de fallo: <10 verde, 10-25 amarillo, >25 rojo

export interface Filters {
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  departmentId?: string;
  categoryId?: string;
  track?: "AWARENESS" | "TECHNICAL";
}

export type Level = "green" | "yellow" | "red" | "insufficient";

export function levelFor(attempts: number, failures: number): { rate: number | null; level: Level } {
  if (attempts < MIN_ATTEMPTS) return { rate: null, level: "insufficient" };
  const rate = Math.round((failures / attempts) * 1000) / 10;
  return { rate, level: rate < THRESHOLDS.green ? "green" : rate <= THRESHOLDS.yellow ? "yellow" : "red" };
}

// Las fechas del filtro son días calendario de la empresa (Ciudad de México, UTC-6 sin horario de verano).
const dayStart = (d: string) => `${d}T00:00:00-06:00`;
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Condiciones SQL comunes. Requiere los alias a (attempts), u (users), r (roles) y ch (challenges). */
export function conditions(f: Filters): Prisma.Sql {
  const c: Prisma.Sql[] = [Prisma.sql`r.name <> 'SECOPS'`, Prisma.sql`a.phase = 'PRACTICE'::"AttemptPhase"`]; // las cuentas de administración no cuentan
  if (f.from) c.push(Prisma.sql`a.created_at >= ${dayStart(f.from)}::timestamptz`);
  if (f.to) c.push(Prisma.sql`a.created_at < ${dayStart(nextDay(f.to))}::timestamptz`);
  if (f.departmentId) c.push(Prisma.sql`u.department_id = ${f.departmentId}::uuid`);
  if (f.categoryId) c.push(Prisma.sql`ch.category_id = ${f.categoryId}::uuid`);
  if (f.track) c.push(Prisma.sql`ch.track = ${f.track}::"Track"`);
  return Prisma.join(c, " AND ");
}

export interface CellRow {
  department_id: string;
  category_id: string;
  attempts: number;
  failures: number;
  avg_time: number | null;
}

export function cellRows(f: Filters) {
  return prisma.$queryRaw<CellRow[]>(Prisma.sql`
    SELECT u.department_id, ch.category_id,
           COUNT(*)::int AS attempts,
           COUNT(*) FILTER (WHERE NOT a.is_successful)::int AS failures,
           AVG(a.time_taken_seconds)::float AS avg_time
    FROM attempts a
    JOIN users u ON u.id = a.user_id
    JOIN roles r ON r.id = u.role_id
    JOIN challenges ch ON ch.id = a.challenge_id
    WHERE ${conditions(f)}
    GROUP BY u.department_id, ch.category_id`);
}

export async function heatmap(f: Filters) {
  const [departments, categories, rows] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    cellRows(f),
  ]);
  const by = new Map(rows.map((r) => [`${r.department_id}|${r.category_id}`, r]));
  const shownDepartments = f.departmentId ? departments.filter((d) => d.id === f.departmentId) : departments;
  const shownCategories = f.categoryId ? categories.filter((c) => c.id === f.categoryId) : categories;
  const cells = shownDepartments.flatMap((d) =>
    shownCategories.map((c) => {
      const r = by.get(`${d.id}|${c.id}`);
      const attempts = r?.attempts ?? 0;
      const failures = r?.failures ?? 0;
      return { departmentId: d.id, categoryId: c.id, attempts, failures, ...levelFor(attempts, failures) };
    }),
  );
  return { departments: shownDepartments, categories: shownCategories, cells, minAttempts: MIN_ATTEMPTS, thresholds: THRESHOLDS };
}
