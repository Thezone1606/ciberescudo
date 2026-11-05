import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();
const created: string[] = [];
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const STRONG = "Una-Clave-Larga-Y-Segura-2026";

let previous: { domains?: string; code?: string };
beforeEach(() => {
  previous = { domains: process.env.SIGNUP_ALLOWED_DOMAINS, code: process.env.SIGNUP_CODE };
  process.env.SIGNUP_ALLOWED_DOMAINS = "dsintelligence.test, @dsintelligence.com";
  delete process.env.SIGNUP_CODE;
});
afterEach(() => {
  const restore = (key: string, value?: string) => (value === undefined ? delete process.env[key] : (process.env[key] = value));
  restore("SIGNUP_ALLOWED_DOMAINS", previous.domains);
  restore("SIGNUP_CODE", previous.code);
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: created } } });
  await prisma.$disconnect();
});

const mail = (domain = "dsintelligence.test") => {
  const e = `registro-${Math.random().toString(36).slice(2, 10)}@${domain}`;
  created.push(e);
  return e;
};
const signup = (body: object) => request(app).post("/api/v1/auth/signup").send(body);
const dept = () => prisma.department.findFirstOrThrow();

describe("registro propio (sign-up)", () => {
  it("crea la cuenta como colaborador, inicia sesión sola y la contraseña elegida funciona", async () => {
    const email = mail();
    const res = await signup({ fullName: "  Persona Nueva  ", email: email.toUpperCase(), password: STRONG, departmentId: (await dept()).id });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("COLABORADOR");
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.fullName).toBe("Persona Nueva");
    expect((await request(app).get("/api/v1/auth/me").set(bearer(res.body.accessToken))).body.email).toBe(email);

    expect((await request(app).post("/api/v1/auth/login").send({ email, password: STRONG })).status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(stored.lastLoginAt).not.toBeNull(); // entra directo: figura como «existente», no como invitada
  });

  it("no permite pedir otro rol ni campos extra: nadie se registra como administrador", async () => {
    const res = await signup({ fullName: "Intruso", email: mail(), password: STRONG, departmentId: (await dept()).id, role: "SECOPS" });
    expect(res.status).toBe(400);
  });

  it("solo acepta los dominios permitidos (con o sin @ en la configuración)", async () => {
    const d = (await dept()).id;
    const bad = await signup({ fullName: "Externo", email: mail("gmail.com"), password: STRONG, departmentId: d });
    expect(bad.status).toBe(400);
    expect(bad.body.error ?? bad.body.code).toBe("email_domain_not_allowed");
    expect((await signup({ fullName: "Otro Dominio", email: mail("dsintelligence.com"), password: STRONG, departmentId: d })).status).toBe(201);
    // Un dominio que solo termina igual no cuenta.
    expect((await signup({ fullName: "Falso", email: mail("falso-dsintelligence.test"), password: STRONG, departmentId: d })).status).toBe(400);
  });

  it("está cerrado si no hay dominios configurados", async () => {
    process.env.SIGNUP_ALLOWED_DOMAINS = "";
    const email = mail();
    const res = await signup({ fullName: "Sin Registro", email, password: STRONG, departmentId: (await dept()).id });
    expect(res.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    const info = await request(app).get("/api/v1/auth/signup-info");
    expect(info.body.enabled).toBe(false);
    expect(info.body.departments).toEqual([]);
  });

  it("con código de registro: exige el correcto", async () => {
    process.env.SIGNUP_CODE = "codigo-del-piloto";
    const d = (await dept()).id;
    const base = { fullName: "Con Codigo", password: STRONG, departmentId: d };
    expect((await signup({ ...base, email: mail() })).status).toBe(403);
    expect((await signup({ ...base, email: mail(), code: "otro" })).status).toBe(403);
    expect((await signup({ ...base, email: mail(), code: "codigo-del-piloto" })).status).toBe(201);
    expect((await request(app).get("/api/v1/auth/signup-info")).body.requiresCode).toBe(true);
  });

  it("rechaza correos repetidos, contraseñas débiles y departamentos que no existen", async () => {
    const d = (await dept()).id;
    const email = mail();
    expect((await signup({ fullName: "Primera Vez", email, password: STRONG, departmentId: d })).status).toBe(201);
    const again = await signup({ fullName: "Segunda Vez", email, password: STRONG, departmentId: d });
    expect(again.status).toBe(409);
    expect(again.body.error ?? again.body.code).toBe("email_taken");

    expect((await signup({ fullName: "Corta", email: mail(), password: "corta123", departmentId: d })).status).toBe(400);
    const local = mail();
    expect((await signup({ fullName: "Con Usuario", email: local, password: `${local.split("@")[0]}-2026!!`, departmentId: d })).status).toBe(400);
    expect((await signup({ fullName: "Sin Depto", email: mail(), password: STRONG, departmentId: "00000000-0000-4000-8000-000000000000" })).status).toBe(400);
    expect((await signup({ fullName: "X", email: mail(), password: STRONG, departmentId: d })).status).toBe(400);
  });

  it("la información pública del registro no incluye datos de personas", async () => {
    const res = await request(app).get("/api/v1/auth/signup-info");
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.domains).toEqual(["dsintelligence.test", "dsintelligence.com"]);
    expect(Object.keys(res.body.departments[0]).sort()).toEqual(["id", "name"]);
  });

  it("una cuenta registrada aparece en la administración como existente", async () => {
    const email = mail();
    await signup({ fullName: "Visible Para Admin", email, password: STRONG, departmentId: (await dept()).id });
    const admin = await request(app).post("/api/v1/auth/login").send({ email: "secops@dsintelligence.test", password: process.env.SEED_PASSWORD });
    const list = await request(app).get(`/api/v1/admin/users?status=existing&search=${encodeURIComponent(email)}`).set(bearer(admin.body.accessToken));
    expect(list.body.users).toHaveLength(1);
  });
});
