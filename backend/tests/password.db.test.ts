import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempUser, deleteTempUser } from "./helpers";

const app = createApp();
const users: string[] = [];
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

afterAll(async () => {
  await Promise.all(users.map(deleteTempUser));
  await prisma.$disconnect();
});

async function session() {
  const u = await createTempUser("COLABORADOR");
  users.push(u.id);
  const res = await request(app).post("/api/v1/auth/login").send({ email: u.email, password: u.password });
  return { ...u, token: res.body.accessToken as string, refresh: res.body.refreshToken as string };
}
const change = (token: string, currentPassword: string, newPassword: string) =>
  request(app).post("/api/v1/auth/password").set(bearer(token)).send({ currentPassword, newPassword });
const login = (email: string, password: string) => request(app).post("/api/v1/auth/login").send({ email, password });

describe("cambio de contraseña", () => {
  it("con la actual correcta: la nueva funciona, la anterior no y las sesiones abiertas se cierran", async () => {
    const s = await session();
    const second = await login(s.email, s.password); // otra sesión (otro dispositivo)
    const res = await change(s.token, s.password, "Clave-Nuev-9");
    expect(res.status).toBe(204);

    expect((await login(s.email, "Clave-Nuev-9")).status).toBe(200);
    expect((await login(s.email, s.password)).status).toBe(401);
    expect((await request(app).get("/api/v1/auth/me").set(bearer(s.token))).status).toBe(401);
    expect((await request(app).get("/api/v1/auth/me").set(bearer(second.body.accessToken))).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: s.refresh })).status).toBe(401);
  });

  it("guarda la nueva con argon2id, nunca en claro", async () => {
    const s = await session();
    await change(s.token, s.password, "Otra-Clave-Distinta-2026!");
    const row = await prisma.user.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(row)).not.toContain("Otra-Clave-Distinta-2026!");
  });

  it("rechaza una contraseña actual incorrecta sin cambiar nada", async () => {
    const s = await session();
    const res = await change(s.token, "no-es-la-actual", "Clave-Nuev-9");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("wrong_password");
    expect((await login(s.email, s.password)).status).toBe(200);
  });

  it("rechaza la nueva si es corta, larga, igual a la actual o contiene el nombre de usuario", async () => {
    const s = await session();
    expect((await change(s.token, s.password, "corta1")).body.issues[0].message).toMatch(/Mínimo 8/);
    const long = await change(s.token, s.password, "Abcdefghijk1!"); // 13 caracteres
    expect(long.status).toBe(400);
    expect(long.body.issues[0].message).toMatch(/Máximo 12/);

    // Las contraseñas iniciales que da la plataforma son más largas; se pasa a una de 8 a 12 para probar el resto.
    const first = "Clave-Nuev-9";
    expect((await change(s.token, s.password, first)).status).toBe(204);
    const short = Math.random().toString(36).slice(2, 6);
    await prisma.user.update({ where: { id: s.id }, data: { email: `${short}@dsintelligence.test` } });
    const t = (await login(`${short}@dsintelligence.test`, first)).body.accessToken as string;
    expect((await change(t, first, first)).body.error).toBe("same_password");
    expect((await change(t, first, `${short}-clave1`)).body.error).toBe("weak_password");
    expect((await login(`${short}@dsintelligence.test`, first)).status).toBe(200); // nada cambió
  });

  it("exige sesión y un cuerpo completo", async () => {
    const s = await session();
    expect((await request(app).post("/api/v1/auth/password").send({ currentPassword: "x", newPassword: "y".repeat(14) })).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/password").set(bearer(s.token)).send({ newPassword: "y".repeat(14) })).status).toBe(400);
  });
});
