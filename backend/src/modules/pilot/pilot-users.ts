import argon2 from "argon2";
import { randomInt } from "node:crypto";
import { prisma } from "../../db";

// Alta masiva de participantes del piloto: CSV de entrada (correo, nombre, departamento, rol) y
// contraseñas iniciales aleatorias que se entregan en una hoja de credenciales.

export interface ParticipantRow {
  email: string;
  fullName: string;
  department: string;
  role: "COLABORADOR" | "ANALISTA";
}
export interface RowError {
  line: number;
  message: string;
}

/** Lector de CSV (RFC 4180): comillas dobles, comas y saltos de línea dentro de comillas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") (row.push(cell), (cell = ""));
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const HEADERS: Record<string, keyof ParticipantRow> = {
  correo: "email", email: "email", nombre: "fullName", departamento: "department", area: "department", área: "department", rol: "role",
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida el CSV completo. Si hay errores no se debe crear a nadie: se corrige el archivo y se reintenta. */
export function parseParticipants(text: string, departments: string[]): { rows: ParticipantRow[]; errors: RowError[] } {
  const table = parseCsv(text);
  const errors: RowError[] = [];
  if (!table.length) return { rows: [], errors: [{ line: 1, message: "El archivo está vacío" }] };

  const columns = table[0].map((h) => HEADERS[h.trim().toLowerCase()]);
  for (const need of ["email", "fullName", "department"] as const) {
    if (!columns.includes(need)) errors.push({ line: 1, message: `Falta la columna «${need === "email" ? "correo" : need === "fullName" ? "nombre" : "departamento"}»` });
  }
  if (errors.length) return { rows: [], errors };

  const byName = new Map(departments.map((d) => [d.toLowerCase(), d]));
  const seen = new Set<string>();
  const rows: ParticipantRow[] = [];
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (key: keyof ParticipantRow) => (cells[columns.indexOf(key)] ?? "").trim();
    const email = get("email").toLowerCase();
    const fullName = get("fullName");
    const dept = byName.get(get("department").toLowerCase());
    const roleRaw = (get("role") || "COLABORADOR").toUpperCase();
    const bad = (message: string) => errors.push({ line, message });

    if (!EMAIL.test(email)) return bad(`Correo no válido: «${get("email")}»`);
    if (seen.has(email)) return bad(`Correo repetido en el archivo: ${email}`);
    seen.add(email);
    if (!fullName || fullName.length > 150) return bad("El nombre es obligatorio (máximo 150 caracteres)");
    if (!dept) return bad(`Departamento desconocido: «${get("department")}». Opciones: ${departments.join(", ")}`);
    if (roleRaw !== "COLABORADOR" && roleRaw !== "ANALISTA") return bad(`Rol no permitido: «${get("role")}» (usa COLABORADOR o ANALISTA)`);
    rows.push({ email, fullName, department: dept, role: roleRaw });
  });
  return { rows, errors };
}

// Sin caracteres que se confunden al leerlos (0/O, 1/l/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Contraseña aleatoria criptográficamente segura (16 caracteres ≈ 91 bits). */
export function generatePassword(length = 16): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export interface ImportResult {
  email: string;
  fullName: string;
  status: "creada" | "contraseña restablecida" | "ya existía";
  password?: string; // solo cuando se creó o se restableció
}

/**
 * Crea las cuentas. Una cuenta que ya existe no se toca (salvo `resetExisting`, que le da una contraseña
 * nueva y cierra sus sesiones); la contraseña solo se devuelve una vez, en el resultado.
 */
export async function importParticipants(rows: ParticipantRow[], opts: { resetExisting?: boolean } = {}): Promise<ImportResult[]> {
  const [roles, departments] = await Promise.all([prisma.role.findMany(), prisma.department.findMany()]);
  const roleId = new Map(roles.map((r) => [r.name, r.id]));
  const deptId = new Map(departments.map((d) => [d.name, d.id]));
  const results: ImportResult[] = [];

  for (const row of rows) {
    const existing = await prisma.user.findUnique({ where: { email: row.email } });
    if (existing && !opts.resetExisting) {
      results.push({ email: row.email, fullName: row.fullName, status: "ya existía" });
      continue;
    }
    const password = generatePassword();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    if (existing) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: existing.id }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
        prisma.refreshToken.deleteMany({ where: { userId: existing.id } }),
      ]);
      results.push({ email: row.email, fullName: row.fullName, status: "contraseña restablecida", password });
    } else {
      await prisma.user.create({
        data: { email: row.email, fullName: row.fullName, passwordHash, roleId: roleId.get(row.role)!, departmentId: deptId.get(row.department)! },
      });
      results.push({ email: row.email, fullName: row.fullName, status: "creada", password });
    }
  }
  return results;
}

/** Hoja de credenciales (CSV con BOM) para entregar a cada persona por un canal seguro. */
export function credentialsCsv(results: ImportResult[]): string {
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [["Correo", "Nombre", "Contraseña inicial", "Estado"], ...results.map((r) => [r.email, r.fullName, r.password ?? "", r.status])];
  return "﻿" + lines.map((l) => l.map(q).join(",")).join("\r\n") + "\r\n";
}
