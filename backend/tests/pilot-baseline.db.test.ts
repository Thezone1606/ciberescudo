import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempChallenge, createTempUser, deleteTempUser, loginTemp, QUICK_PAYLOAD, QUICK_SOLUTION } from "./helpers";
import { answer as send, bearer, correctFor, rememberPhase, setPhase } from "./pilot-helpers";

const app = createApp();
const users: string[] = [];
const challenges: string[] = [];
let restore: () => Promise<void>;
const answer = (token: string, id: string, response: unknown, time = 12) => send(app, token, id, response, time);
const next = async (token: string) => (await request(app).get("/api/v1/pilot/diagnostic").set(bearer(token))).body;

async function player() {
  const u = await createTempUser("COLABORADOR");
  users.push(u.id);
  return { id: u.id, token: (await loginTemp(app, u)).accessToken };
}
async function practice() {
  const c = await createTempChallenge({ payloadConfig: QUICK_PAYLOAD, solution: QUICK_SOLUTION });
  challenges.push(c.id);
  return c;
}
const play = (token: string, id: string) =>
  request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(token)).send({ time_taken_seconds: 3, response: { choice: "b" } });

beforeAll(async () => {
  restore = await rememberPhase();
  await setPhase("BASELINE");
});
afterAll(async () => {
  await restore();
  await Promise.all(users.map(deleteTempUser));
  await prisma.challenge.deleteMany({ where: { id: { in: challenges } } });
  await prisma.$disconnect();
});

describe("diagnóstico inicial (BASELINE)", () => {
  it("bloquea la práctica hasta terminarlo, sin dar retroalimentación ni tocar el progreso", async () => {
    const p = await player();
    const c = await practice();
    const st = (await request(app).get("/api/v1/pilot/status").set(bearer(p.token))).body;
    expect(st).toMatchObject({ phase: "BASELINE", baselineRequired: true, diagnostic: { active: true, total: 8, answered: 0, pending: 8 } });

    const blocked = await play(p.token, c.id);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toBe("diagnostic_pending");

    const first = await next(p.token);
    expect(first.item.index).toBe(1);
    expect(JSON.stringify(first.item.payload)).not.toMatch(/indicators|isLegitimate|solution/);
    const res = await answer(p.token, first.item.id, await correctFor(first.item.id));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ recorded: true, total: 8, answered: 1 }); // sin veredicto

    const u = await prisma.user.findUniqueOrThrow({ where: { id: p.id } });
    expect([u.currentXp, u.currentStreak, u.shieldIntegrity]).toEqual([0, 0, 100]);
    expect(await prisma.attempt.findFirstOrThrow({ where: { userId: p.id } })).toMatchObject({ phase: "BASELINE", isSuccessful: true, timeTakenSeconds: 12 });
  });

  it("un reto se contesta una sola vez por fase; lo mal formado no se registra", async () => {
    const p = await player();
    const item = (await next(p.token)).item;
    expect((await answer(p.token, item.id, { action: "borrar_todo" })).status).toBe(400);
    expect(await prisma.attempt.count({ where: { userId: p.id } })).toBe(0);
    expect((await answer(p.token, item.id, await correctFor(item.id))).status).toBe(201);
    const again = await answer(p.token, item.id, await correctFor(item.id));
    expect(again.status).toBe(409);
    expect(again.body.error).toBe("already_answered");

    const second = (await next(p.token)).item;
    const both = await Promise.all([answer(p.token, second.id, await correctFor(second.id)), answer(p.token, second.id, await correctFor(second.id))]);
    expect(both.map((r) => r.status).sort()).toEqual([201, 409]); // dos envíos simultáneos: solo uno cuenta
    expect(await prisma.attempt.count({ where: { userId: p.id } })).toBe(2);
  });

  it("al terminar los 8 se desbloquea la práctica", async () => {
    const p = await player();
    const c = await practice();
    for (let i = 1; i <= 8; i++) {
      const { item } = await next(p.token);
      expect(item.index).toBe(i);
      expect((await answer(p.token, item.id, await correctFor(item.id))).status).toBe(201);
    }
    expect(await next(p.token)).toMatchObject({ item: null, answered: 8, total: 8 });
    expect((await request(app).get("/api/v1/pilot/status").set(bearer(p.token))).body).toMatchObject({ baselineRequired: false, diagnostic: { completed: true, pending: 0 } });
    const ok = await play(p.token, c.id);
    expect(ok.status).toBe(200);
    expect(ok.body.is_successful).toBe(true);
  });

  it("un reto inexistente o de práctica no se acepta como diagnóstico", async () => {
    const p = await player();
    const c = await practice();
    expect((await answer(p.token, "00000000-0000-4000-8000-000000000000", { action: "mark_safe" })).status).toBe(404);
    expect((await answer(p.token, c.id, { choice: "b" })).status).toBe(404);
  });
});
