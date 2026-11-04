import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { credentialsCsv, importParticipants, parseParticipants } from "../src/modules/pilot/pilot-users";
import { createTempUser, deleteTempUser } from "./helpers";

const app = createApp();
const tag = `pilot-test-${Date.now()}`;
const created: string[] = [];
const login = (email: string, password: string) => request(app).post("/api/v1/auth/login").send({ email, password });

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: "pilot-test-" } } });
  await Promise.all(created.map(deleteTempUser));
  await prisma.$disconnect();
});

async function rowsFor(emails: string[], role = "COLABORADOR") {
  const departments = (await prisma.department.findMany()).map((d) => d.name);
  const csv = ["correo,nombre,departamento,rol", ...emails.map((e, i) => `${e},Persona ${i + 1},Finanzas,${role}`)].join("\n");
  const { rows, errors } = parseParticipants(csv, departments);
  expect(errors).toEqual([]);
  return rows;
}

describe("alta masiva de participantes", () => {
  it("crea las cuentas con el rol y departamento correctos, y cada contraseña inicia sesión", async () => {
    const emails = [`${tag}-a@dsintelligence.test`, `${tag}-b@dsintelligence.test`];
    const results = await importParticipants(await rowsFor(emails, "ANALISTA"));
    expect(results.map((r) => r.status)).toEqual(["creada", "creada"]);
    expect(new Set(results.map((r) => r.password)).size).toBe(2);

    for (const r of results) {
      const res = await login(r.email, r.password!);
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ role: "ANALISTA", department: { name: "Finanzas" } });
    }
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: emails[0] } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(stored)).not.toContain(results[0].password!); // la contraseña no se guarda en claro
  });

  it("una cuenta que ya existe no se toca ni cambia su contraseña", async () => {
    const u = await createTempUser("COLABORADOR");
    created.push(u.id);
    const [row] = await rowsFor([u.email]);
    const [res] = await importParticipants([row]);
    expect(res).toMatchObject({ status: "ya existía" });
    expect(res.password).toBeUndefined();
    expect((await login(u.email, u.password)).status).toBe(200); // la contraseña anterior sigue valiendo
  });

  it("con restablecer: contraseña nueva, la anterior deja de servir y las sesiones abiertas se cierran", async () => {
    const u = await createTempUser("COLABORADOR");
    created.push(u.id);
    const first = await login(u.email, u.password);
    const oldToken = first.body.accessToken as string;
    expect((await request(app).get("/api/v1/auth/me").set({ Authorization: `Bearer ${oldToken}` })).status).toBe(200);

    const [row] = await rowsFor([u.email]);
    const [res] = await importParticipants([row], { resetExisting: true });
    expect(res.status).toBe("contraseña restablecida");
    expect((await login(u.email, u.password)).status).toBe(401);
    expect((await login(u.email, res.password!)).status).toBe(200);
    expect((await request(app).get("/api/v1/auth/me").set({ Authorization: `Bearer ${oldToken}` })).status).toBe(401);
  });

  it("la hoja de credenciales es un CSV con BOM, sin contraseña para las cuentas que ya existían", () => {
    const csv = credentialsCsv([
      { email: "a@x.com", fullName: "Ana, la \"primera\"", status: "creada", password: "Abc123xyz" },
      { email: "b@x.com", fullName: "Beto", status: "ya existía" },
    ]);
    expect(csv.startsWith("﻿Correo,Nombre,Contraseña inicial,Estado\r\n")).toBe(true);
    expect(csv).toContain('a@x.com,"Ana, la ""primera""",Abc123xyz,creada');
    expect(csv).toContain("b@x.com,Beto,,ya existía");
  });
});
