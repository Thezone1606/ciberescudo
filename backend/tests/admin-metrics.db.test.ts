import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { calendarDay } from "../src/modules/gamification/rules";
import { csvCell, toCsv } from "../src/modules/admin/metrics.admin.service";
import { levelFor } from "../src/modules/admin/metrics-core";
import { createTempChallenge, createTempUser, deleteTempUser, loginTemp, QUICK_PAYLOAD, QUICK_SOLUTION } from "./helpers";

const app = createApp();
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const users: string[] = [];
const challenges: string[] = [];
let admin: string;
let player: string;
let finanzas: { id: string; name: string };
let desarrollo: { id: string; name: string };
let cat1: { id: string; name: string };
let cat2: { id: string; name: string };
let phishingChallenge: string;
let quickChallenge: string;

async function playerIn(departmentId: string, role: "COLABORADOR" | "SECOPS" = "COLABORADOR") {
  const u = await createTempUser(role);
  users.push(u.id);
  await prisma.user.update({ where: { id: u.id }, data: { departmentId } });
  return u;
}

const attempts = (userId: string, challengeId: string, ok: number, bad: number, seconds = 10) =>
  prisma.attempt.createMany({
    data: [
      ...Array.from({ length: ok }, () => ({ userId, challengeId, isSuccessful: true, responsePayload: {}, timeTakenSeconds: seconds })),
      ...Array.from({ length: bad }, () => ({ userId, challengeId, isSuccessful: false, responsePayload: {}, timeTakenSeconds: seconds })),
    ],
  });

beforeAll(async () => {
  [finanzas, desarrollo] = await Promise.all([
    prisma.department.findUniqueOrThrow({ where: { name: "Finanzas" } }),
    prisma.department.findUniqueOrThrow({ where: { name: "Desarrollo" } }),
  ]);
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" }, take: 2 });
  [cat1, cat2] = cats;

  const adminUser = await createTempUser("SECOPS");
  users.push(adminUser.id);
  admin = (await loginTemp(app, adminUser)).accessToken;
  const p = await playerIn(finanzas.id);
  player = (await loginTemp(app, p)).accessToken;

  // Retos propios: uno de phishing (para el MTTD) y uno de decisión rápida, en categorías distintas.
  const ph = await createTempChallenge({ payloadConfig: { type: "phishing" }, solution: { indicators: ["hidden_url"] } });
  const qk = await createTempChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION });
  await prisma.challenge.update({ where: { id: ph.id }, data: { categoryId: cat1.id } });
  await prisma.challenge.update({ where: { id: qk.id }, data: { categoryId: cat2.id } });
  phishingChallenge = ph.id;
  quickChallenge = qk.id;
  challenges.push(ph.id, qk.id);

  // Finanzas × cat1: 10 intentos, 1 fallo (10 % → amarillo). Finanzas × cat2: 20 intentos, 1 fallo (5 % → verde).
  // Desarrollo × cat2: 20 intentos, 8 fallos (40 % → rojo). Desarrollo × cat1: 4 intentos (insuficiente).
  const f1 = await playerIn(finanzas.id);
  const f2 = await playerIn(finanzas.id);
  const d1 = await playerIn(desarrollo.id);
  await attempts(f1.id, phishingChallenge, 4, 0, 10); // 4 aciertos de phishing en 10 s
  await attempts(f2.id, phishingChallenge, 5, 1, 20); // 5 aciertos en 20 s y 1 fallo
  await attempts(f1.id, quickChallenge, 19, 1);
  await attempts(d1.id, quickChallenge, 12, 8);
  await attempts(d1.id, phishingChallenge, 4, 0, 10);
  // Una cuenta de administración con intentos no debe contar.
  const sec = await playerIn(finanzas.id, "SECOPS");
  await attempts(sec.id, quickChallenge, 0, 30);
  // Racha vigente de 8 días para un jugador.
  await prisma.user.update({ where: { id: f1.id }, data: { currentStreak: 8, lastActivityDate: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z") } });
});

afterAll(async () => {
  await Promise.all(users.map(deleteTempUser));
  await prisma.challenge.deleteMany({ where: { id: { in: challenges } } });
  await prisma.$disconnect();
});

describe("reglas puras", () => {
  it("semáforo: <10 verde, 10-25 amarillo, >25 rojo; pocos intentos no se califican", () => {
    expect(levelFor(20, 1)).toEqual({ rate: 5, level: "green" });
    expect(levelFor(10, 1)).toEqual({ rate: 10, level: "yellow" });
    expect(levelFor(20, 5)).toEqual({ rate: 25, level: "yellow" });
    expect(levelFor(20, 6)).toEqual({ rate: 30, level: "red" });
    expect(levelFor(4, 4)).toEqual({ rate: null, level: "insufficient" });
    expect(levelFor(0, 0)).toEqual({ rate: null, level: "insufficient" });
  });

  it("CSV: escapa comas y comillas, neutraliza fórmulas y deja vacíos los nulos", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+cmd")).toBe("'+cmd");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell(-5)).toBe("-5"); // un número negativo real no se altera
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe("");
    const csv = toCsv([{ departamento: "A", categoria: "B", intentos: 5, fallos: 1, tasa_de_fallo_pct: null, tiempo_promedio_s: 3.5 }]);
    expect(csv.startsWith("﻿Departamento,Categoría")).toBe(true);
    expect(csv).toContain("A,B,5,1,,3.5\r\n");
  });
});

describe("permisos", () => {
  it("colaborador y sin sesión no acceden a métricas ni exportación", async () => {
    for (const path of ["/admin/metrics/overview", "/admin/metrics/heatmap", "/admin/export", "/admin/filters"]) {
      expect((await request(app).get(`/api/v1${path}`).set(bearer(player))).status, path).toBe(403);
      expect((await request(app).get(`/api/v1${path}`)).status, path).toBe(401);
    }
  });
});

describe("mapa de calor", () => {
  const get = (qs = "") => request(app).get(`/api/v1/admin/metrics/heatmap${qs}`).set(bearer(admin));
  const cell = (body: any, d: string, c: string) => body.cells.find((x: any) => x.departmentId === d && x.categoryId === c);

  it("clasifica cada celda con el semáforo y oculta la tasa cuando hay pocos intentos", async () => {
    const { body } = await get();
    expect(body.departments).toHaveLength(5);
    expect(body.minAttempts).toBe(5);
    expect(cell(body, finanzas.id, cat1.id)).toMatchObject({ attempts: 10, failures: 1, rate: 10, level: "yellow" });
    expect(cell(body, finanzas.id, cat2.id)).toMatchObject({ attempts: 20, failures: 1, rate: 5, level: "green" });
    expect(cell(body, desarrollo.id, cat2.id)).toMatchObject({ attempts: 20, failures: 8, rate: 40, level: "red" });
    expect(cell(body, desarrollo.id, cat1.id)).toMatchObject({ attempts: 4, rate: null, level: "insufficient" });
  });

  it("las cuentas de administración no cuentan (30 fallos de SecOps no aparecen)", async () => {
    const { body } = await get();
    expect(cell(body, finanzas.id, cat2.id).attempts).toBe(20);
  });

  it("los filtros por departamento, categoría, ruta y fechas acotan el resultado", async () => {
    const byDept = (await get(`?departmentId=${desarrollo.id}`)).body;
    expect(byDept.departments).toHaveLength(1);
    const byCat = (await get(`?categoryId=${cat2.id}`)).body;
    expect(byCat.categories).toHaveLength(1);
    const technical = (await get("?track=TECHNICAL")).body;
    expect(technical.cells.reduce((s: number, c: any) => s + c.attempts, 0)).toBe(0); // todos los retos de prueba son AWARENESS
    const today = calendarDay(new Date()); // día calendario de la empresa, igual que el filtro
    const future = (await get(`?from=${calendarDay(new Date(Date.now() + 3 * 86_400_000))}`)).body;
    expect(future.cells.reduce((s: number, c: any) => s + c.attempts, 0)).toBe(0);
    const includesToday = (await get(`?from=${today}&to=${today}`)).body;
    expect(includesToday.cells.reduce((s: number, c: any) => s + c.attempts, 0)).toBeGreaterThan(0);
  });

  it("rechaza filtros inválidos con 400", async () => {
    expect((await get("?from=2026-12-01&to=2026-11-01")).status).toBe(400);
    expect((await get("?from=ayer")).status).toBe(400);
    expect((await get("?departmentId=no-uuid")).status).toBe(400);
    expect((await get("?track=OTRA")).status).toBe(400);
  });
});

describe("indicadores", () => {
  const overview = (qs = "") => request(app).get(`/api/v1/admin/metrics/overview${qs}`).set(bearer(admin));

  it("adopción, racha vigente, MTTD, escudo y tasa de fallo", async () => {
    const { body } = await overview();
    expect(body.adoption.activeLast7Days).toBe(3); // f1, f2 y d1 acertaron esta semana (la cuenta SecOps no)
    expect(body.streakAdherence.users).toBe(1);
    expect(body.mttdSeconds).toBe(Math.round(((4 * 10 + 5 * 20 + 4 * 10) / 13) * 10) / 10); // promedio ponderado de aciertos de phishing
    expect(body.attempts).toBe(24 + 6 + 24); // f1 + f2 + d1; los 30 intentos de SecOps no cuentan
    expect(body.failureRate).toBe(18.5); // 10 fallos de 54
    expect(body.averageShield).toBeGreaterThanOrEqual(0);
    expect(body.averageShield).toBeLessThanOrEqual(5);
  });

  it("el filtro por departamento recalcula los jugadores y la adopción", async () => {
    const all = (await overview()).body;
    const dev = (await overview(`?departmentId=${desarrollo.id}`)).body;
    expect(dev.players).toBeLessThan(all.players);
    expect(dev.adoption.activeLast7Days).toBe(1);
    expect(dev.streakAdherence.users).toBe(0);
  });
});

describe("exportación", () => {
  const exp = (qs = "") => request(app).get(`/api/v1/admin/export${qs}`).set(bearer(admin));

  it("JSON: filas agregadas, tasa nula en celdas con pocos intentos y sin datos de personas", async () => {
    const res = await exp("?format=json");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="reporte-cumplimiento-\d{4}-\d{2}-\d{2}\.json"/);
    const small = res.body.rows.find((r: any) => r.departamento === desarrollo.name && r.categoria === cat1.name);
    expect(small).toMatchObject({ intentos: 4, tasa_de_fallo_pct: null });
    const big = res.body.rows.find((r: any) => r.departamento === desarrollo.name && r.categoria === cat2.name);
    expect(big).toMatchObject({ intentos: 20, fallos: 8, tasa_de_fallo_pct: 40 });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/@|tmp-|userId|email|fullName/);
    for (const id of users) expect(text).not.toContain(id);
  });

  it("CSV: tipo, BOM, encabezados y fin de línea CRLF; el formato por defecto es JSON", async () => {
    const res = await exp("?format=csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv; charset=utf-8/);
    expect(res.text.startsWith("﻿Departamento,Categoría,Intentos,Fallos")).toBe(true);
    expect(res.text.split("\r\n").length).toBeGreaterThan(3);
    expect((await exp()).body.rows).toBeTruthy();
  });

  it("respeta los filtros y valida el formato", async () => {
    const res = await exp(`?departmentId=${finanzas.id}`);
    expect(res.body.rows.every((r: any) => r.departamento === finanzas.name)).toBe(true);
    expect((await exp("?format=xml")).status).toBe(400);
  });

  it("los filtros disponibles para el tablero incluyen departamentos y categorías", async () => {
    const res = await request(app).get("/api/v1/admin/filters").set(bearer(admin));
    expect(res.body.departments).toHaveLength(5);
    expect(res.body.categories).toHaveLength(6);
  });
});
