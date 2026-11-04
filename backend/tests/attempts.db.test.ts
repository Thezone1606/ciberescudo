import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { calendarDay } from "../src/modules/gamification/rules";
import { createTempChallenge, createTempUser, deleteTempUser, loginTemp, QUICK_PAYLOAD, QUICK_SOLUTION } from "./helpers";

const app = createApp();
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const users: string[] = [];
const challenges: string[] = [];

async function newPlayer() {
  const u = await createTempUser("COLABORADOR");
  users.push(u.id);
  const { accessToken } = await loginTemp(app, u);
  return { id: u.id, token: accessToken };
}

async function newChallenge(opts: Parameters<typeof createTempChallenge>[0] = { payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION }) {
  const c = await createTempChallenge(opts);
  challenges.push(c.id);
  return c;
}

const attempt = (token: string, challengeId: string, response: unknown, time = 5) =>
  request(app).post(`/api/v1/challenges/${challengeId}/attempt`).set(bearer(token)).send({ time_taken_seconds: time, response });

const right = { choice: "b" };
const wrong = { choice: "a" };

afterAll(async () => {
  await Promise.all(users.map(deleteTempUser)); // borra también sus intentos (cascade)
  await prisma.challenge.deleteMany({ where: { id: { in: challenges } } });
  await prisma.$disconnect();
});

describe("acierto", () => {
  it("suma XP, abre la racha, guarda el intento y no revela la solución", async () => {
    const p = await newPlayer();
    const c = await newChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION, baseXp: 25, difficulty: "INTERMEDIATE" });

    const res = await attempt(p.token, c.id, right);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      is_successful: true,
      xp_awarded: 25,
      current_xp: 25,
      current_streak: 1,
      shield_integrity: 100,
      explanation_guide: "Explicación de prueba",
    });
    expect(Object.keys(res.body).sort()).toEqual([
      "cooldown_until", "current_streak", "current_xp", "explanation_guide", "feedback", "is_successful", "shield_integrity", "xp_awarded",
    ]);

    const rows = await prisma.attempt.findMany({ where: { userId: p.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ isSuccessful: true, timeTakenSeconds: 5 });
  });

  it("repetir un reto ya resuelto no vuelve a dar XP", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    expect((await attempt(p.token, c.id, right)).body.current_xp).toBe(10);
    const again = await attempt(p.token, c.id, right);
    expect(again.body).toMatchObject({ is_successful: true, xp_awarded: 0, current_xp: 10, current_streak: 1 });
  });

  it("racha: ayer +1 y el día 7 el XP sube 1.2x", async () => {
    const p = await newPlayer();
    const c = await newChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION, baseXp: 25 });
    const yesterday = calendarDay(new Date(Date.now() - 86_400_000));
    await prisma.user.update({ where: { id: p.id }, data: { currentStreak: 6, lastActivityDate: new Date(`${yesterday}T00:00:00Z`) } });

    const res = await attempt(p.token, c.id, right);
    expect(res.body).toMatchObject({ current_streak: 7, xp_awarded: 30 });
  });

  it("racha: un hueco de varios días la reinicia en 1", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    const old = calendarDay(new Date(Date.now() - 3 * 86_400_000));
    await prisma.user.update({ where: { id: p.id }, data: { currentStreak: 9, lastActivityDate: new Date(`${old}T00:00:00Z`) } });
    expect((await attempt(p.token, c.id, right)).body.current_streak).toBe(1);
  });
});

describe("fallo, escudo y enfriamiento", () => {
  it("cada fallo resta 20 al escudo y no da XP ni toca la racha", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    const res = await attempt(p.token, c.id, wrong);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ is_successful: false, xp_awarded: 0, current_xp: 0, current_streak: 0, shield_integrity: 80, cooldown_until: null });
    expect(res.body.explanation_guide).toBe("Explicación de prueba");
  });

  it("5 fallos agotan el escudo; el sexto da 423 y no se registra", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    let last;
    for (let i = 0; i < 5; i++) last = await attempt(p.token, c.id, wrong);
    expect(last!.body).toMatchObject({ shield_integrity: 0 });
    expect(last!.body.cooldown_until).toBeTruthy();

    const blocked = await attempt(p.token, c.id, right);
    expect(blocked.status).toBe(423);
    expect(blocked.body.error).toBe("cooldown");
    expect(blocked.body.retry_after_seconds).toBeGreaterThan(0);
    expect(blocked.body.retry_after_seconds).toBeLessThanOrEqual(120);
    expect(await prisma.attempt.count({ where: { userId: p.id } })).toBe(5);
  });

  it("pasados los 2 minutos el escudo se restaura y se puede reintentar", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    for (let i = 0; i < 5; i++) await attempt(p.token, c.id, wrong);
    await prisma.user.update({ where: { id: p.id }, data: { cooldownUntil: new Date(Date.now() - 1000) } });

    const res = await attempt(p.token, c.id, wrong);
    expect(res.status).toBe(200);
    expect(res.body.shield_integrity).toBe(80); // restaurado a 100 y luego -20
  });

  it("5 fallos simultáneos se procesan sin perder ninguno", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    const results = await Promise.all(Array.from({ length: 5 }, () => attempt(p.token, c.id, wrong)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await prisma.attempt.count({ where: { userId: p.id } })).toBe(5);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).shieldIntegrity).toBe(0);
  });

  it("aciertos simultáneos del mismo reto dan el XP una sola vez", async () => {
    const p = await newPlayer();
    const c = await newChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION, baseXp: 25 });
    await Promise.all(Array.from({ length: 4 }, () => attempt(p.token, c.id, right)));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).currentXp).toBe(25);
  });
});

describe("validación y errores", () => {
  it("respuesta mal formada da 400 y no cambia el estado", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    const res = await attempt(p.token, c.id, { nada: true });
    expect(res.status).toBe(400);
    expect(await prisma.attempt.count({ where: { userId: p.id } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).shieldIntegrity).toBe(100);
  });

  it("tiempo fuera de rango, sin tiempo o sin respuesta dan 400", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    expect((await attempt(p.token, c.id, right, -1)).status).toBe(400);
    expect((await attempt(p.token, c.id, right, 3601)).status).toBe(400);
    const url = `/api/v1/challenges/${c.id}/attempt`;
    expect((await request(app).post(url).set(bearer(p.token)).send({ response: right })).status).toBe(400);
    expect((await request(app).post(url).set(bearer(p.token)).send({ time_taken_seconds: 5 })).status).toBe(400);
  });

  it("reto inexistente o desactivado da 404; id no UUID da 400", async () => {
    const p = await newPlayer();
    const off = await newChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION, isActive: false });
    expect((await attempt(p.token, "00000000-0000-4000-8000-000000000000", right)).status).toBe(404);
    expect((await attempt(p.token, off.id, right)).status).toBe(404);
    expect((await attempt(p.token, "abc", right)).status).toBe(400);
  });

  it("sin token da 401", async () => {
    const c = await newChallenge();
    const res = await request(app).post(`/api/v1/challenges/${c.id}/attempt`).send({ time_taken_seconds: 5, response: right });
    expect(res.status).toBe(401);
  });

  it("un reto mal configurado da 500 sin penalizar al jugador", async () => {
    const p = await newPlayer();
    const broken = await newChallenge({ payloadConfig: { type: "quick" }, solution: { roto: true } });
    const res = await attempt(p.token, broken.id, right);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("challenge_misconfigured");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).shieldIntegrity).toBe(100);
  });
});

describe("los 4 tipos de reto", () => {
  it("phishing, custodia y terminal se evalúan de punta a punta", async () => {
    const p = await newPlayer();
    const phishing = await newChallenge({ payloadConfig: { type: "phishing" }, solution: { indicators: ["hidden_url"] } });
    const custody = await newChallenge({ payloadConfig: { type: "custody" }, solution: { order: ["RAM", "Red"] } });
    const terminal = await newChallenge({ payloadConfig: { type: "terminal" }, solution: { verdict: "CONFIRMED" } });
    const ok = async (id: string, body: unknown) => (await attempt(p.token, id, body)).body.is_successful;

    expect(await ok(phishing.id, { identified_indicators: ["hidden_url"], action: "report_incident" })).toBe(true);
    expect(await ok(custody.id, { order: ["RAM", "Red"] })).toBe(true);
    expect(await ok(custody.id, { order: ["Red", "RAM"] })).toBe(false);
    expect(await ok(terminal.id, { verdict: "CONFIRMED" })).toBe(true);
    expect(await ok(terminal.id, { verdict: "FALSE_POSITIVE" })).toBe(false);
  });
});

describe("leaderboard por departamento", () => {
  it("devuelve un ranking agregado, ordenado y sin datos de personas", async () => {
    const p = await newPlayer();
    const res = await request(app).get("/api/v1/metrics/leaderboard").set(bearer(p.token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body.map((r: { rank: number }) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    for (const row of res.body) {
      expect(Object.keys(row).sort()).toEqual(["averageXp", "department", "departmentId", "members", "rank", "totalXp"]);
    }
    const avgs = res.body.map((r: { averageXp: number }) => r.averageXp);
    expect(avgs).toEqual([...avgs].sort((a, b) => b - a));
    expect(JSON.stringify(res.body)).not.toMatch(/@|email|fullName/);
  });

  it("exige sesión", async () => {
    expect((await request(app).get("/api/v1/metrics/leaderboard")).status).toBe(401);
  });
});

describe("estado que consume la interfaz", () => {
  it("la lista de retos marca solved solo en los que este usuario acertó", async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    const c = await newChallenge();
    await attempt(a.token, c.id, right);

    const find = async (token: string) => {
      const res = await request(app).get("/api/v1/challenges?track=AWARENESS").set(bearer(token));
      return res.body.find((x: { id: string }) => x.id === c.id);
    };
    expect((await find(a.token)).solved).toBe(true);
    expect((await find(b.token)).solved).toBe(false);
  });

  it("un intento fallido no marca el reto como resuelto", async () => {
    const p = await newPlayer();
    const c = await newChallenge();
    await attempt(p.token, c.id, wrong);
    const res = await request(app).get("/api/v1/challenges?track=AWARENESS").set(bearer(p.token));
    expect(res.body.find((x: { id: string }) => x.id === c.id).solved).toBe(false);
  });

  it("/auth/me muestra el escudo restaurado cuando el enfriamiento ya terminó", async () => {
    const p = await newPlayer();
    await prisma.user.update({ where: { id: p.id }, data: { shieldIntegrity: 0, cooldownUntil: new Date(Date.now() + 60_000) } });
    const during = await request(app).get("/api/v1/auth/me").set(bearer(p.token));
    expect(during.body.shieldIntegrity).toBe(0);
    expect(during.body.cooldownUntil).toBeTruthy();

    await prisma.user.update({ where: { id: p.id }, data: { cooldownUntil: new Date(Date.now() - 1000) } });
    const after = await request(app).get("/api/v1/auth/me").set(bearer(p.token));
    expect(after.body.shieldIntegrity).toBe(100);
    expect(after.body.cooldownUntil).toBeNull();
  });
});
