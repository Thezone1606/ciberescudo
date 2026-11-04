import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempChallenge, createTempUser, deleteTempUser, loginTemp, QUICK_PAYLOAD, QUICK_SOLUTION } from "./helpers";
import { bearer, rememberPhase, setPhase } from "./pilot-helpers";

const app = createApp();
const users: string[] = [];
const challenges: string[] = [];
let restore: () => Promise<void>;
let adminToken: string;
let playerToken: string;
let malicious: string[] = [];
let legit: string[] = [];

async function makeUser(role: "COLABORADOR" | "ANALISTA" | "SECOPS") {
  const u = await createTempUser(role);
  users.push(u.id);
  return u;
}

type Phase = "BASELINE" | "POSTTEST";
/** Diagnóstico de una persona: aciertos en maliciosos y legítimos, y segundos por acierto malicioso. */
async function diagnostic(userId: string, phase: Phase, maliciousOk: number, legitOk: number, seconds: number) {
  await prisma.attempt.createMany({
    data: [
      ...malicious.map((challengeId, i) => ({ userId, challengeId, phase, isSuccessful: i < maliciousOk, timeTakenSeconds: seconds, responsePayload: {} })),
      ...legit.map((challengeId, i) => ({ userId, challengeId, phase, isSuccessful: i < legitOk, timeTakenSeconds: 30, responsePayload: {} })),
    ],
  });
}

/** Aciertos de práctica en `days` días consecutivos que terminan hoy. */
async function practiceDays(userId: string, challengeId: string, days: number) {
  await prisma.attempt.createMany({
    data: Array.from({ length: days }, (_, k) => ({
      userId, challengeId, phase: "PRACTICE" as const, isSuccessful: true, timeTakenSeconds: 5, responsePayload: {},
      createdAt: new Date(Date.now() - k * 86_400_000),
    })),
  });
}

beforeAll(async () => {
  restore = await rememberPhase();
  await setPhase("POSTTEST");
  const diag = await prisma.challenge.findMany({ where: { isDiagnostic: true, isActive: true }, orderBy: { orderIndex: "asc" } });
  malicious = diag.filter((c) => !(c.solution as { isLegitimate: boolean }).isLegitimate).map((c) => c.id);
  legit = diag.filter((c) => (c.solution as { isLegitimate: boolean }).isLegitimate).map((c) => c.id);

  const secops = await makeUser("SECOPS");
  adminToken = (await loginTemp(app, secops)).accessToken;
  const colab = await makeUser("COLABORADOR");
  playerToken = (await loginTemp(app, colab)).accessToken;

  const u1 = await makeUser("COLABORADOR");
  const u2 = await makeUser("ANALISTA");
  const u3 = await makeUser("COLABORADOR"); // solo diagnóstico inicial: no entra en las comparaciones
  await diagnostic(u1.id, "BASELINE", 3, 2, 20);
  await diagnostic(u1.id, "POSTTEST", 6, 1, 10);
  await diagnostic(u2.id, "BASELINE", 5, 2, 10);
  await diagnostic(u2.id, "POSTTEST", 6, 2, 8);
  await diagnostic(u3.id, "BASELINE", 6, 2, 5);

  const practice = await createTempChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION });
  challenges.push(practice.id);
  await practiceDays(u1.id, practice.id, 4); // 4 días seguidos: cuenta como adherente
  await practiceDays(u2.id, practice.id, 3); // 3 días: no

  await prisma.susResponse.createMany({
    data: [
      { userId: u1.id, answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], score: 100 },
      { userId: u2.id, answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], score: 50 },
    ],
  });
});

afterAll(async () => {
  await restore();
  await Promise.all(users.map(deleteTempUser));
  await prisma.challenge.deleteMany({ where: { id: { in: challenges } } });
  await prisma.$disconnect();
});

const report = () => request(app).get("/api/v1/admin/pilot/report").set(bearer(adminToken));

describe("reporte del piloto", () => {
  it("solo SecOps lo ve", async () => {
    expect((await request(app).get("/api/v1/admin/pilot/report").set(bearer(playerToken))).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/pilot/report")).status).toBe(401);
  });

  it("detección y falsos positivos se miden en las mismas personas (las que hicieron ambos diagnósticos)", async () => {
    const { body } = await report();
    expect(body.diagnostic).toMatchObject({ baselineCompleted: 3, posttestCompleted: 2, paired: 2, items: { total: 8, malicious: 6, legitimate: 2 } });
    // inicial: (3 + 5) de 12 maliciosos; final: 12 de 12  →  (100 − 66.7) / 66.7 × 100
    expect(body.detection).toEqual({ baselinePct: 66.7, posttestPct: 100, deltaPct: 49.9 });
    // legítimos: 0 de 4 fallados al inicio; 1 de 4 al final
    expect(body.falsePositives).toEqual({ baselinePct: 0, posttestPct: 25 });
  });

  it("tiempo de detección: promedio de los aciertos maliciosos por fase y su variación", async () => {
    const { body } = await report();
    // inicial: (3×20 + 5×10) / 8 = 13.75 → 13.8; final: (6×10 + 6×8) / 12 = 9
    expect(body.mttd).toEqual({ baselineSeconds: 13.8, posttestSeconds: 9, deltaPct: -34.8 });
  });

  it("adherencia: personas con 4 o más días consecutivos de aciertos en la práctica", async () => {
    const { body } = await report();
    const total = await prisma.user.count({ where: { role: { name: { not: "SECOPS" } } } });
    expect(body.adherence).toMatchObject({ users: 1, total, minConsecutiveDays: 4 });
    expect(body.adherence.ratePct).toBe(Math.round((1 / total) * 1000) / 10);
    expect(body.practice).toMatchObject({ attempts: 7, successRatePct: 100, activeUsers: 2 });
  });

  it("SUS: media, mediana, nota y si cumple la meta de 80", async () => {
    const { body } = await report();
    expect(body.sus).toMatchObject({ responses: 2, mean: 75, median: 75, min: 50, max: 100, grade: "Buena", goal: 80, meetsGoal: false });
    expect(body.sus.perQuestionMean[0]).toBe(4); // (5 + 3) / 2
    expect(body.sus.perQuestionMean[1]).toBe(2); // (1 + 3) / 2
  });

  it("composición del grupo y avisos metodológicos (muestra pequeña)", async () => {
    const { body } = await report();
    const technical = await prisma.user.count({ where: { role: { name: "ANALISTA" } } });
    expect(body.participants.technical).toBe(technical);
    expect(body.participants.technical + body.participants.nonTechnical).toBe(body.participants.total);
    expect(body.notes.join(" ")).toMatch(/Solo 2 personas/);
    expect(body.notes.join(" ")).toMatch(/mismos correos/);
  });

  it("nunca incluye datos de personas", async () => {
    const text = JSON.stringify((await report()).body);
    expect(text).not.toMatch(/@|tmp-|userId|email|fullName/);
    for (const id of users) expect(text).not.toContain(id);
  });
});

describe("exportación del reporte", () => {
  it("CSV con BOM, encabezado y una fila por indicador", async () => {
    const res = await request(app).get("/api/v1/admin/pilot/report?format=csv").set(bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv; charset=utf-8/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="reporte-piloto-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(res.text.startsWith("﻿Indicador,Valor,Detalle\r\n")).toBe(true);
    expect(res.text).toContain("Variación en la detección,49.9 %,(final - inicial) / inicial");
    expect(res.text).toContain("SUS: cumple la meta,No,");
    expect(res.text.trim().split("\r\n")).toHaveLength(19);
  });

  it("JSON descargable y formato inválido rechazado", async () => {
    const res = await request(app).get("/api/v1/admin/pilot/report?format=json").set(bearer(adminToken));
    expect(res.headers["content-disposition"]).toMatch(/reporte-piloto-.*\.json/);
    expect(res.body.generatedAt).toBeTruthy();
    expect((await request(app).get("/api/v1/admin/pilot/report?format=xml").set(bearer(adminToken))).status).toBe(400);
  });

  it("sin datos, las cifras son nulas en lugar de inventar cero", async () => {
    await prisma.attempt.deleteMany({ where: { phase: { in: ["BASELINE", "POSTTEST"] } } });
    const { body } = await report();
    expect(body.detection).toEqual({ baselinePct: null, posttestPct: null, deltaPct: null });
    expect(body.diagnostic.paired).toBe(0);
    expect(body.mttd.deltaPct).toBeNull();
  });
});
