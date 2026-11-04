import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempUser, deleteTempUser, loginTemp } from "./helpers";
import { answer as send, bearer, correctFor, rememberPhase, setPhase } from "./pilot-helpers";

const app = createApp();
const users: string[] = [];
let restore: () => Promise<void>;
let admin: string;
let player: { id: string; token: string };

async function login(role: "COLABORADOR" | "SECOPS") {
  const u = await createTempUser(role);
  users.push(u.id);
  return { id: u.id, token: (await loginTemp(app, u)).accessToken };
}

const putPhase = (token: string, phase: unknown) => request(app).put("/api/v1/admin/pilot/phase").set(bearer(token)).send({ phase });
const sus = (token: string, answers: unknown) => request(app).post("/api/v1/pilot/sus").set(bearer(token)).send({ answers });

beforeAll(async () => {
  restore = await rememberPhase();
  await setPhase("OFF");
  admin = (await login("SECOPS")).token;
  player = await login("COLABORADOR");
});

afterAll(async () => {
  await prisma.challenge.updateMany({ where: { isDiagnostic: true }, data: { isActive: true } });
  await restore();
  await Promise.all(users.map(deleteTempUser));
  await prisma.$disconnect();
});

describe("control de fase (administrador)", () => {
  it("solo SecOps puede ver o cambiar la fase", async () => {
    expect((await request(app).get("/api/v1/admin/pilot").set(bearer(player.token))).status).toBe(403);
    expect((await putPhase(player.token, "BASELINE")).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/pilot")).status).toBe(401);
  });

  it("cambia de fase y devuelve el estado con el conteo de retos", async () => {
    const res = await putPhase(admin, "PRACTICE");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ phase: "PRACTICE", diagnosticItems: { total: 8, malicious: 6, legitimate: 2 } });
    expect((await request(app).get("/api/v1/admin/pilot").set(bearer(admin))).body.phase).toBe("PRACTICE");
  });

  it("rechaza una fase que no existe", async () => {
    expect((await putPhase(admin, "FINALIZADO")).status).toBe(400);
    expect((await putPhase(admin, undefined)).status).toBe(400);
  });

  it("no abre un diagnóstico sin retos activos", async () => {
    await prisma.challenge.updateMany({ where: { isDiagnostic: true }, data: { isActive: false } });
    for (const phase of ["BASELINE", "POSTTEST"]) {
      const res = await putPhase(admin, phase);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe("no_diagnostic");
    }
    expect((await putPhase(admin, "PRACTICE")).status).toBe(200); // las demás fases no lo necesitan
    await prisma.challenge.updateMany({ where: { isDiagnostic: true }, data: { isActive: true } });
  });
});

describe("evaluación final (POSTTEST) y SUS", () => {
  it("el diagnóstico final se abre aparte del inicial: se puede contestar de nuevo", async () => {
    const p = await login("COLABORADOR");
    await putPhase(admin, "BASELINE");
    const first = (await request(app).get("/api/v1/pilot/diagnostic").set(bearer(p.token))).body.item;
    expect((await send(app, p.token, first.id, await correctFor(first.id))).status).toBe(201);

    await putPhase(admin, "POSTTEST");
    const again = (await request(app).get("/api/v1/pilot/diagnostic").set(bearer(p.token))).body;
    expect(again).toMatchObject({ phase: "POSTTEST", answered: 0 });
    expect((await send(app, p.token, first.id, await correctFor(first.id))).status).toBe(201);
    const phases = (await prisma.attempt.findMany({ where: { userId: p.id }, select: { phase: true } })).map((a) => a.phase).sort();
    expect(phases).toEqual(["BASELINE", "POSTTEST"]);
  });

  it("en POSTTEST no se bloquea la práctica", async () => {
    await putPhase(admin, "POSTTEST");
    const st = (await request(app).get("/api/v1/pilot/status").set(bearer(player.token))).body;
    expect(st.baselineRequired).toBe(false);
  });

  it("el SUS no está disponible antes del final y no se puede enviar", async () => {
    const p = await login("COLABORADOR");
    await putPhase(admin, "PRACTICE");
    expect((await request(app).get("/api/v1/pilot/sus").set(bearer(p.token))).body).toMatchObject({ available: false, done: false });
    const res = await sus(p.token, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("sus_closed");
  });

  it("en POSTTEST se contesta una vez; se guarda la puntuación y no se repite", async () => {
    const p = await login("COLABORADOR");
    await putPhase(admin, "POSTTEST");
    const info = (await request(app).get("/api/v1/pilot/sus").set(bearer(p.token))).body;
    expect(info.available).toBe(true);
    expect(info.questions).toHaveLength(10);

    expect((await sus(p.token, [3, 3, 3])).status).toBe(400);
    expect((await sus(p.token, [0, 3, 3, 3, 3, 3, 3, 3, 3, 3])).status).toBe(400);
    expect((await sus(p.token, [3, 3, 3, 3, 3, 3, 3, 3, 3, 6])).status).toBe(400);
    expect((await sus(p.token, "texto")).status).toBe(400);

    const ok = await sus(p.token, [5, 1, 5, 1, 5, 1, 5, 1, 5, 1]);
    expect(ok.status).toBe(201);
    expect((await prisma.susResponse.findUniqueOrThrow({ where: { userId: p.id } })).score).toBe(100);
    const dup = await sus(p.token, [1, 5, 1, 5, 1, 5, 1, 5, 1, 5]);
    expect(dup.status).toBe(409);
    expect((await prisma.susResponse.findUniqueOrThrow({ where: { userId: p.id } })).score).toBe(100);
    expect((await request(app).get("/api/v1/pilot/status").set(bearer(p.token))).body.sus).toEqual({ available: true, done: true });
  });

  it("CLOSED conserva el SUS disponible y cierra el diagnóstico", async () => {
    const p = await login("COLABORADOR");
    await putPhase(admin, "CLOSED");
    expect((await request(app).get("/api/v1/pilot/sus").set(bearer(p.token))).body.available).toBe(true);
    expect((await request(app).get("/api/v1/pilot/diagnostic").set(bearer(p.token))).status).toBe(409);
  });
});
