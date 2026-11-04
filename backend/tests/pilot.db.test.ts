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

async function player() {
  const u = await createTempUser("COLABORADOR");
  users.push(u.id);
  return { id: u.id, token: (await loginTemp(app, u)).accessToken };
}


beforeAll(async () => {
  restore = await rememberPhase();
  await setPhase("OFF");
});

afterAll(async () => {
  await restore();
  await Promise.all(users.map(deleteTempUser));
  await prisma.challenge.deleteMany({ where: { id: { in: challenges } } });
  await prisma.$disconnect();
});

describe("los retos de diagnóstico no existen para la práctica", () => {
  it("no aparecen en la lista ni se pueden abrir o intentar como práctica", async () => {
    const p = await player();
    const diag = await prisma.challenge.findFirstOrThrow({ where: { isDiagnostic: true } });
    const list = await request(app).get("/api/v1/challenges?track=AWARENESS").set(bearer(p.token));
    expect(list.body.some((c: { id: string }) => c.id === diag.id)).toBe(false);
    expect(list.body).toHaveLength(15);
    expect((await request(app).get(`/api/v1/challenges/${diag.id}`).set(bearer(p.token))).status).toBe(404);
    const att = await request(app).post(`/api/v1/challenges/${diag.id}/attempt`).set(bearer(p.token)).send({ time_taken_seconds: 3, response: { action: "mark_safe" } });
    expect(att.status).toBe(404);
  });

  it("hay 8 retos de diagnóstico: 6 maliciosos y 2 legítimos", async () => {
    const items = await prisma.challenge.findMany({ where: { isDiagnostic: true, isActive: true } });
    expect(items).toHaveLength(8);
    expect(items.filter((i) => (i.solution as { isLegitimate: boolean }).isLegitimate)).toHaveLength(2);
  });
});

describe("fase apagada", () => {
  it("OFF: el diagnóstico está cerrado y no se bloquea la práctica", async () => {
    const p = await player();
    const st = await request(app).get("/api/v1/pilot/status").set(bearer(p.token));
    expect(st.body).toMatchObject({ phase: "OFF", baselineRequired: false, sus: { available: false } });
    const res = await request(app).get("/api/v1/pilot/diagnostic").set(bearer(p.token));
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("diagnostic_closed");
  });

  it("sin sesión todo devuelve 401", async () => {
    for (const path of ["/pilot/status", "/pilot/diagnostic", "/pilot/sus"]) expect((await request(app).get(`/api/v1${path}`)).status).toBe(401);
  });
});

