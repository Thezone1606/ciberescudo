import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempUser, deleteTempUser, loginTemp } from "./helpers";
import { bearer } from "./pilot-helpers";

const app = createApp();
const users: string[] = [];
const created: string[] = [];
let admin: string;
let player: { id: string; token: string };
let categoryId: string;
let n = 0;

async function login(role: "COLABORADOR" | "SECOPS") {
  const u = await createTempUser(role);
  users.push(u.id);
  return { id: u.id, token: (await loginTemp(app, u)).accessToken };
}

const quick = (over: object = {}) => ({
  title: `TEST-DIAG ${Date.now()}-${n++}`, categoryId, track: "AWARENESS", difficultyLevel: "BASIC", explanationGuide: "Explicación de prueba",
  content: { type: "quick", scenario: "S", question: "¿Qué haces?", options: ["A", "B"], correctIndex: 1 }, ...over,
});

async function create(body: object) {
  const res = await request(app).post("/api/v1/admin/challenges").set(bearer(admin)).send(body);
  if (res.status === 201) created.push(res.body.id);
  return res;
}

beforeAll(async () => {
  admin = (await login("SECOPS")).token;
  player = await login("COLABORADOR");
  categoryId = (await prisma.category.findFirstOrThrow()).id;
});

afterAll(async () => {
  await Promise.all(users.map(deleteTempUser));
  await prisma.challenge.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

describe("retos de diagnóstico desde administración", () => {
  it("se crean como diagnóstico, no aparecen en la práctica y la lista de administración los distingue", async () => {
    const res = await create(quick({ isDiagnostic: true }));
    expect(res.status).toBe(201);
    expect(res.body.isDiagnostic).toBe(true);

    const practice = await request(app).get("/api/v1/challenges?track=AWARENESS").set(bearer(player.token));
    expect(practice.body.some((c: { id: string }) => c.id === res.body.id)).toBe(false);

    const list = (await request(app).get("/api/v1/admin/challenges").set(bearer(admin))).body;
    expect(list.find((c: { id: string }) => c.id === res.body.id).isDiagnostic).toBe(true);
    // la lista pone primero los retos de práctica y al final los de diagnóstico
    const flags = list.map((c: { isDiagnostic: boolean }) => c.isDiagnostic);
    expect(flags.indexOf(true)).toBeGreaterThan(flags.lastIndexOf(false));
  });

  it("el orden por defecto se calcula dentro de los retos de diagnóstico, no de la práctica", async () => {
    const a = await create(quick({ isDiagnostic: true }));
    const b = await create(quick({ isDiagnostic: true }));
    expect(b.body.orderIndex).toBe(a.body.orderIndex + 1);
    const practice = await create(quick());
    expect(practice.body.orderIndex).toBe(16); // los 15 de práctica + 1; no cuenta los 8 de diagnóstico
  });

  it("solo correos de phishing y decisiones rápidas pueden ser de diagnóstico", async () => {
    const res = await request(app).post("/api/v1/admin/challenges").set(bearer(admin)).send(
      quick({ isDiagnostic: true, track: "TECHNICAL", content: { type: "custody", scenario: "S", order: ["Uno", "Dos"] } }),
    );
    expect(res.status).toBe(400);
    expect(res.body.issues.find((i: { path: string[] }) => i.path[0] === "isDiagnostic").message).toMatch(/solo admite/);
  });

  it("no se puede mover un reto entre práctica y diagnóstico cuando ya tiene intentos", async () => {
    const c = await create(quick());
    await request(app).post(`/api/v1/challenges/${c.body.id}/attempt`).set(bearer(player.token)).send({ time_taken_seconds: 3, response: { choice: "b" } });
    const res = await request(app).put(`/api/v1/admin/challenges/${c.body.id}`).set(bearer(admin)).send({ ...quick({ isDiagnostic: true }), title: c.body.title });
    expect(res.status).toBe(400);
    expect(res.body.issues[0].message).toMatch(/ya tiene intentos/);
    // sin intentos sí se puede
    const free = await create(quick());
    const ok = await request(app).put(`/api/v1/admin/challenges/${free.body.id}`).set(bearer(admin)).send({ ...quick({ isDiagnostic: true }), title: free.body.title });
    expect(ok.status).toBe(200);
    expect(ok.body.isDiagnostic).toBe(true);
  });

  it("los intentos de diagnóstico no cuentan en el mapa de calor ni en los indicadores de práctica", async () => {
    const before = (await request(app).get("/api/v1/admin/metrics/overview").set(bearer(admin))).body.attempts;
    const diag = await prisma.challenge.findFirstOrThrow({ where: { isDiagnostic: true, title: { startsWith: "Diagnóstico" } } });
    await prisma.attempt.create({ data: { userId: player.id, challengeId: diag.id, phase: "BASELINE", isSuccessful: false, timeTakenSeconds: 9, responsePayload: {} } });
    const after = (await request(app).get("/api/v1/admin/metrics/overview").set(bearer(admin))).body.attempts;
    expect(after).toBe(before);
    const cells = (await request(app).get("/api/v1/admin/metrics/heatmap").set(bearer(admin))).body.cells;
    expect(cells.reduce((s: number, c: { attempts: number }) => s + c.attempts, 0)).toBe(before);
  });
});
