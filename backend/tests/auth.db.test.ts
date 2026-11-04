import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { env } from "../src/config/env";
import { prisma } from "../src/db";
import { loginAs, USERS } from "./helpers";

const app = createApp();
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

afterAll(() => prisma.$disconnect());

describe("login", () => {
  it("credenciales correctas emiten tokens y perfil sin hash", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: USERS.colaborador, password: process.env.SEED_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.tokenType).toBe("Bearer");
    expect(res.body.user.role).toBe("COLABORADOR");
    expect(res.body.user.shieldIntegrity).toBe(100);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
  });

  it("contraseña incorrecta y correo inexistente dan el mismo 401", async () => {
    const bad = await request(app).post("/api/v1/auth/login").send({ email: USERS.colaborador, password: "mal" });
    const none = await request(app).post("/api/v1/auth/login").send({ email: "nadie@dsintelligence.test", password: "mal" });
    expect(bad.status).toBe(401);
    expect(none.status).toBe(401);
    expect(bad.body).toEqual(none.body);
  });

  it("cuerpo inválido devuelve 400", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "no-es-correo" });
    expect(res.status).toBe(400);
  });
});

describe("/auth/me y tokens", () => {
  it("devuelve el perfil con un token válido", async () => {
    const { accessToken } = await loginAs(app, "analista");
    const res = await request(app).get("/api/v1/auth/me").set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(USERS.analista);
    expect(res.body.role).toBe("ANALISTA");
  });

  it("sin token, token basura o expirado devuelven 401", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/v1/auth/me").set(bearer("basura"))).status).toBe(401);

    const { user } = await loginAs(app, "colaborador");
    const expired = jwt.sign({ sub: user.id, role: "COLABORADOR", typ: "access" }, env.JWT_ACCESS_SECRET, { expiresIn: -10 });
    expect((await request(app).get("/api/v1/auth/me").set(bearer(expired))).status).toBe(401);
  });

  it("rechaza un token firmado con otro secreto o con alg none", async () => {
    const { user } = await loginAs(app, "secops");
    const forged = jwt.sign({ sub: user.id, role: "SECOPS", typ: "access" }, "otro-secreto-que-no-es-el-real-12345");
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(forged))).status).toBe(401);

    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: user.id, role: "SECOPS", typ: "access" })).toString("base64url");
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(`${header}.${body}.`))).status).toBe(401);
  });

  it("un refresh token no sirve como access token y viceversa", async () => {
    const { accessToken, refreshToken } = await loginAs(app, "colaborador");
    expect((await request(app).get("/api/v1/auth/me").set(bearer(refreshToken))).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: accessToken })).status).toBe(401);
  });
});

describe("RBAC", () => {
  it("colaborador y analista reciben 403 en /admin; SECOPS entra", async () => {
    const col = await loginAs(app, "colaborador");
    const ana = await loginAs(app, "analista");
    const sec = await loginAs(app, "secops");
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(col.accessToken))).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(ana.accessToken))).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(sec.accessToken))).status).toBe(200);
  });

  it("/admin sin token devuelve 401", async () => {
    expect((await request(app).get("/api/v1/admin/ping")).status).toBe(401);
  });
});

describe("refresh y logout", () => {
  it("el refresh emite un nuevo access que funciona", async () => {
    const { refreshToken } = await loginAs(app, "colaborador");
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(200);
    const me = await request(app).get("/api/v1/auth/me").set(bearer(res.body.accessToken));
    expect(me.status).toBe(200);
  });

  it("tras logout el refresh token queda revocado", async () => {
    const { accessToken, refreshToken } = await loginAs(app, "analista");
    expect((await request(app).post("/api/v1/auth/logout").set(bearer(accessToken))).status).toBe(204);
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
    expect((await loginAs(app, "analista")).accessToken).toBeTruthy();
  });
});
