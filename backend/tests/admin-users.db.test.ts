import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempUser, deleteTempUser } from "./helpers";

const app = createApp();
const created: string[] = [];
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const login = (email: string, password: string) => request(app).post("/api/v1/auth/login").send({ email, password });

afterAll(async () => {
  await Promise.all(created.map(deleteTempUser));
  await prisma.$disconnect();
});

async function player() {
  const u = await createTempUser("COLABORADOR");
  created.push(u.id);
  return u;
}
async function admin() {
  const u = await createTempUser("SECOPS");
  created.push(u.id);
  const res = await login(u.email, u.password);
  return { ...u, token: res.body.accessToken as string };
}
const list = (token: string, query = "") => request(app).get(`/api/v1/admin/users${query}`).set(bearer(token));

describe("usuarios: nuevos y existentes", () => {
  it("una cuenta sin primer acceso es «nueva» y pasa a «existente» al iniciar sesión", async () => {
    const a = await admin();
    const p = await player();

    const before = (await list(a.token, `?search=${encodeURIComponent(p.email)}`)).body.users[0];
    expect(before.status).toBe("new");
    expect(before.lastLoginAt).toBeNull();

    expect((await login(p.email, p.password)).status).toBe(200);
    const after = (await list(a.token, `?search=${encodeURIComponent(p.email)}`)).body.users[0];
    expect(after.status).toBe("existing");
    expect(after.lastLoginAt).not.toBeNull();
  });

  it("el filtro por estado separa las dos listas", async () => {
    const a = await admin();
    const fresh = await player();
    const used = await player();
    await login(used.email, used.password);

    const nuevos = (await list(a.token, "?status=new")).body.users.map((u: { email: string }) => u.email);
    const existentes = (await list(a.token, "?status=existing")).body.users.map((u: { email: string }) => u.email);
    expect(nuevos).toContain(fresh.email);
    expect(nuevos).not.toContain(used.email);
    expect(existentes).toContain(used.email);
    expect(existentes).not.toContain(fresh.email);
  });

  it("muestra el avance: retos resueltos, intentos y tasa de acierto", async () => {
    const a = await admin();
    const p = await player();
    const challenges = await prisma.challenge.findMany({ where: { isActive: true, isDiagnostic: false, track: "AWARENESS" }, take: 2, orderBy: { orderIndex: "asc" } });
    // Dos intentos del mismo reto (uno fallido, uno correcto) y otro reto resuelto una vez.
    await prisma.attempt.createMany({
      data: [
        { userId: p.id, challengeId: challenges[0].id, isSuccessful: false, responsePayload: {}, timeTakenSeconds: 9 },
        { userId: p.id, challengeId: challenges[0].id, isSuccessful: true, responsePayload: {}, timeTakenSeconds: 9 },
        { userId: p.id, challengeId: challenges[1].id, isSuccessful: true, responsePayload: {}, timeTakenSeconds: 9 },
      ],
    });

    const row = (await list(a.token, `?search=${encodeURIComponent(p.email)}`)).body.users[0];
    expect(row.solvedAwareness).toBe(2);
    expect(row.solvedTechnical).toBe(0);
    expect(row.attempts).toBe(3);
    expect(row.successRate).toBe(66.7);
    expect(row.lastAttemptAt).not.toBeNull();
    const body = (await list(a.token)).body;
    expect(body.totals.awareness).toBeGreaterThan(0);
  });

  it("los intentos del diagnóstico no cuentan como práctica", async () => {
    const a = await admin();
    const p = await player();
    const diag = await prisma.challenge.findFirstOrThrow({ where: { isDiagnostic: true, isActive: true } });
    await prisma.attempt.create({ data: { userId: p.id, challengeId: diag.id, isSuccessful: true, responsePayload: {}, timeTakenSeconds: 5, phase: "BASELINE" } });
    const row = (await list(a.token, `?search=${encodeURIComponent(p.email)}`)).body.users[0];
    expect(row.attempts).toBe(0);
    expect(row.solvedAwareness).toBe(0);
    expect(row.baselineDone).toBe(false); // falta contestar el resto de los correos
  });

  it("solo el administrador puede ver o editar usuarios", async () => {
    const p = await player();
    const token = (await login(p.email, p.password)).body.accessToken as string;
    expect((await list(token)).status).toBe(403);
    expect((await request(app).patch(`/api/v1/admin/users/${p.id}`).set(bearer(token)).send({ fullName: "Otro nombre" })).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/users")).status).toBe(401);
  });
});

describe("usuarios: edición", () => {
  it("cambia nombre, departamento y rol; el rol nuevo rige de inmediato", async () => {
    const a = await admin();
    const p = await player();
    const token = (await login(p.email, p.password)).body.accessToken as string;
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(token))).status).toBe(403);

    const dept = await prisma.department.findFirstOrThrow({ where: { NOT: { id: (await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).departmentId } } });
    const res = await request(app)
      .patch(`/api/v1/admin/users/${p.id}`)
      .set(bearer(a.token))
      .send({ fullName: "  Nombre Editado  ", departmentId: dept.id, role: "SECOPS" });
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe("Nombre Editado");
    expect(res.body.department.id).toBe(dept.id);
    expect(res.body.role).toBe("SECOPS");
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(token))).status).toBe(200);
  });

  it("desactivar una cuenta cierra sus sesiones y le impide volver a entrar; reactivarla lo permite", async () => {
    const a = await admin();
    const p = await player();
    const session = await login(p.email, p.password);
    const token = session.body.accessToken as string;

    const off = await request(app).patch(`/api/v1/admin/users/${p.id}`).set(bearer(a.token)).send({ isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.isActive).toBe(false);
    expect((await request(app).get("/api/v1/auth/me").set(bearer(token))).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: session.body.refreshToken })).status).toBe(401);
    const denied = await login(p.email, p.password);
    expect(denied.status).toBe(401);
    expect(denied.body.error ?? denied.body.code).toBe("invalid_credentials");

    await request(app).patch(`/api/v1/admin/users/${p.id}`).set(bearer(a.token)).send({ isActive: true }).expect(200);
    expect((await login(p.email, p.password)).status).toBe(200);
  });

  it("no deja que un administrador se desactive o se quite el rol a sí mismo", async () => {
    const a = await admin();
    const r1 = await request(app).patch(`/api/v1/admin/users/${a.id}`).set(bearer(a.token)).send({ isActive: false });
    expect(r1.status).toBe(409);
    const r2 = await request(app).patch(`/api/v1/admin/users/${a.id}`).set(bearer(a.token)).send({ role: "COLABORADOR" });
    expect(r2.status).toBe(409);
    expect((await request(app).get("/api/v1/auth/me").set(bearer(a.token))).status).toBe(200);
  });

  it("rechaza datos inválidos y campos desconocidos", async () => {
    const a = await admin();
    const p = await player();
    const patch = (body: object) => request(app).patch(`/api/v1/admin/users/${p.id}`).set(bearer(a.token)).send(body);
    expect((await patch({ fullName: "A" })).status).toBe(400);
    expect((await patch({ role: "ROOT" })).status).toBe(400);
    expect((await patch({ departmentId: "no-es-uuid" })).status).toBe(400);
    expect((await patch({ passwordHash: "x" })).status).toBe(400); // no se puede tocar lo que no se edita
    expect((await patch({ departmentId: "00000000-0000-4000-8000-000000000000" })).status).toBe(400);
    expect((await request(app).patch("/api/v1/admin/users/00000000-0000-4000-8000-000000000000").set(bearer(a.token)).send({ fullName: "Alguien" })).status).toBe(404);
  });
});

describe("usuarios: restablecer contraseña", () => {
  it("genera una contraseña nueva que funciona, invalida la anterior y deja la cuenta como «nueva»", async () => {
    const a = await admin();
    const p = await player();
    const session = await login(p.email, p.password);

    const res = await request(app).post(`/api/v1/admin/users/${p.id}/reset-password`).set(bearer(a.token));
    expect(res.status).toBe(200);
    expect(res.body.password).toHaveLength(16);
    expect(res.body.password).not.toBe(p.password);

    expect((await login(p.email, p.password)).status).toBe(401);
    expect((await request(app).get("/api/v1/auth/me").set(bearer(session.body.accessToken))).status).toBe(401);
    const row = (await list(a.token, `?search=${encodeURIComponent(p.email)}`)).body.users[0];
    expect(row.status).toBe("new");
    expect((await login(p.email, res.body.password)).status).toBe(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: p.id } });
    expect(stored.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(stored.passwordHash).not.toContain(res.body.password);
  });

  it("404 si el usuario no existe y 403 sin rol de administrador", async () => {
    const a = await admin();
    const p = await player();
    const token = (await login(p.email, p.password)).body.accessToken as string;
    expect((await request(app).post("/api/v1/admin/users/00000000-0000-4000-8000-000000000000/reset-password").set(bearer(a.token))).status).toBe(404);
    expect((await request(app).post(`/api/v1/admin/users/${p.id}/reset-password`).set(bearer(token))).status).toBe(403);
  });
});
