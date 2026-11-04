import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempUser, deleteTempUser, loginTemp } from "./helpers";

const app = createApp();
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const created: string[] = [];

async function tempUser(role: "COLABORADOR" | "ANALISTA" | "SECOPS") {
  const u = await createTempUser(role);
  created.push(u.id);
  return u;
}

afterAll(async () => {
  await Promise.all(created.map(deleteTempUser));
  await prisma.$disconnect();
});

describe("refresh token de un solo uso", () => {
  it("rota: el nuevo refresh funciona y el anterior ya no", async () => {
    const u = await tempUser("COLABORADOR");
    const first = await loginTemp(app, u);
    const second = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: first.refreshToken });
    expect(second.status).toBe(200);
    expect(second.body.refreshToken).not.toBe(first.refreshToken);

    const third = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: second.body.refreshToken });
    expect(third.status).toBe(200);
  });

  it("reutilizar un refresh ya canjeado da 401 y revoca TODAS las sesiones", async () => {
    const u = await tempUser("COLABORADOR");
    const first = await loginTemp(app, u);
    const rotated = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: first.refreshToken });
    expect(rotated.status).toBe(200);

    // el atacante (o el cliente viejo) presenta el token ya usado
    const replay = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);

    // el token legítimo recién emitido también queda inservible, igual que su access
    const after = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: rotated.body.refreshToken });
    expect(after.status).toBe(401);
    const me = await request(app).get("/api/v1/auth/me").set(bearer(rotated.body.accessToken));
    expect(me.status).toBe(401);

    // y el usuario puede volver a entrar con su contraseña
    expect((await loginTemp(app, u)).accessToken).toBeTruthy();
  });

  it("dos canjes simultáneos del mismo refresh no pueden ganar los dos", async () => {
    const u = await tempUser("COLABORADOR");
    const { refreshToken } = await loginTemp(app, u);
    const [a, b] = await Promise.all([
      request(app).post("/api/v1/auth/refresh").send({ refreshToken }),
      request(app).post("/api/v1/auth/refresh").send({ refreshToken }),
    ]);
    expect([a.status, b.status].filter((s) => s === 200).length).toBeLessThanOrEqual(1);
    expect([a.status, b.status]).toContain(401);
  });

  it("un refresh con firma válida pero sin fila en la BD se rechaza", async () => {
    const u = await tempUser("COLABORADOR");
    const { refreshToken } = await loginTemp(app, u);
    await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

describe("access token revocable", () => {
  it("tras logout el access token deja de servir de inmediato", async () => {
    const u = await tempUser("SECOPS");
    const { accessToken } = await loginTemp(app, u);
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(accessToken))).status).toBe(200);

    expect((await request(app).post("/api/v1/auth/logout").set(bearer(accessToken))).status).toBe(204);
    expect((await request(app).get("/api/v1/auth/me").set(bearer(accessToken))).status).toBe(401);
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(accessToken))).status).toBe(401);
  });

  it("un cambio de rol se aplica al instante con el mismo token", async () => {
    const u = await tempUser("SECOPS");
    const { accessToken } = await loginTemp(app, u);
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(accessToken))).status).toBe(200);

    const colaborador = await prisma.role.findUniqueOrThrow({ where: { name: "COLABORADOR" } });
    await prisma.user.update({ where: { id: u.id }, data: { roleId: colaborador.id } });
    expect((await request(app).get("/api/v1/admin/ping").set(bearer(accessToken))).status).toBe(403);
  });

  it("un usuario eliminado pierde el acceso con su token aún vigente", async () => {
    const u = await tempUser("COLABORADOR");
    const { accessToken } = await loginTemp(app, u);
    await prisma.user.delete({ where: { id: u.id } });
    expect((await request(app).get("/api/v1/auth/me").set(bearer(accessToken))).status).toBe(401);
  });
});
