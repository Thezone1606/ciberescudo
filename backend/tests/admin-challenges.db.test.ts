import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createTempUser, deleteTempUser, loginTemp } from "./helpers";

const app = createApp();
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const users: string[] = [];
const createdIds: string[] = [];
let admin: string;
let player: string;
let categoryId: string;
let n = 0;
const title = (s: string) => `TEST-ADM ${s} ${Date.now()}-${n++}`;

async function login(role: "COLABORADOR" | "SECOPS") {
  const u = await createTempUser(role);
  users.push(u.id);
  return (await loginTemp(app, u)).accessToken;
}

beforeAll(async () => {
  admin = await login("SECOPS");
  player = await login("COLABORADOR");
  categoryId = (await prisma.category.findFirstOrThrow()).id;
});

afterAll(async () => {
  await Promise.all(users.map(deleteTempUser));
  await prisma.challenge.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

const email = {
  fromName: "Soporte", from: "soporte@dsintelIigence.com", to: "yo@dsintelligence.com", subject: "Urgente", date: "hoy",
  body: ["Hola", { link: "Entrar", href: "http://falso.example/login" }],
  attachments: [{ name: "a.pdf.exe", size: "1 KB" }],
};

const base = (extra: object) => ({ title: title("reto"), categoryId, difficultyLevel: "BASIC", explanationGuide: "Explicación de prueba", ...extra });
const phishing = (over: object = {}) => base({ track: "AWARENESS", content: { type: "phishing", email, indicators: ["sender_spoofing", "hidden_url"], isLegitimate: false, ...over } });
const quick = (over: object = {}) => base({ track: "AWARENESS", content: { type: "quick", scenario: "S", question: "¿Qué haces?", options: ["A", "B", "C"], correctIndex: 1, ...over } });
const custody = (over: object = {}) => base({ track: "TECHNICAL", content: { type: "custody", scenario: "S", order: ["Uno", "Dos", "Tres"], ...over } });
const terminal = (over: object = {}) =>
  base({ track: "TECHNICAL", content: { type: "terminal", host: "analista@lab", cwd: "~/caso", scenario: "S", objective: "O", verdict: "CONFIRMED",
    files: [{ name: "log.txt", binary: false, content: "linea uno\nlinea dos" }, { name: "x.exe", binary: true, sha256: "a".repeat(64) }], whois: { "malo.example": "Domain: MALO" }, ...over } });

async function create(body: object) {
  const res = await request(app).post("/api/v1/admin/challenges").set(bearer(admin)).send(body);
  if (res.status === 201) createdIds.push(res.body.id);
  return res;
}

describe("permisos", () => {
  it("sin sesión 401 y colaborador 403 en todas las rutas de retos", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const calls = [
      () => request(app).get("/api/v1/admin/challenges"),
      () => request(app).post("/api/v1/admin/challenges").send({}),
      () => request(app).put(`/api/v1/admin/challenges/${id}`).send({}),
      () => request(app).patch(`/api/v1/admin/challenges/${id}/active`).send({ isActive: false }),
    ];
    for (const call of calls) expect((await call()).status).toBe(401);
    expect((await request(app).get("/api/v1/admin/challenges").set(bearer(player))).status).toBe(403);
    expect((await request(app).post("/api/v1/admin/challenges").set(bearer(player)).send(phishing())).status).toBe(403);
  });
});

describe("crear un reto de cada tipo y jugarlo", () => {
  const cases: [string, () => object, Record<string, unknown>, Record<string, unknown>][] = [
    ["phishing", phishing, { identified_indicators: ["sender_spoofing", "hidden_url"], action: "report_incident" }, { identified_indicators: ["hidden_url"] }],
    ["quick", quick, { choice: "b" }, { choice: "a" }],
    ["custody", custody, { order: ["Uno", "Dos", "Tres"] }, { order: ["Tres", "Dos", "Uno"] }],
    ["terminal", terminal, { verdict: "CONFIRMED" }, { verdict: "FALSE_POSITIVE" }],
  ];
  for (const [type, build, right, wrong] of cases) {
    it(`${type}: se crea, aparece para el colaborador sin solución y se evalúa bien`, async () => {
      const res = await create(build());
      expect(res.status).toBe(201);
      expect(res.body.content.type).toBe(type);
      const id = res.body.id;
      const track = res.body.track;

      const list = await request(app).get(`/api/v1/challenges?track=${track}`).set(bearer(player));
      const mine = list.body.find((c: { id: string }) => c.id === id);
      expect(mine).toBeTruthy();
      expect(JSON.stringify(mine)).not.toMatch(/solution|explanationGuide|isLegitimate/);

      const ok = await request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(player)).send({ time_taken_seconds: 5, response: right });
      expect(ok.body.is_successful).toBe(true);
      const bad = await request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(player)).send({ time_taken_seconds: 5, response: wrong });
      expect(bad.body.is_successful).toBe(false);
    });
  }

  it("el XP por defecto sigue la dificultad y el orden se asigna al final de la ruta", async () => {
    const a = await create({ ...quick(), difficultyLevel: "ADVANCED" });
    const b = await create(quick());
    expect(a.body.baseXp).toBe(50);
    expect(b.body.baseXp).toBe(10);
    expect(b.body.orderIndex).toBe(a.body.orderIndex + 1);
  });

  it("custody: el jugador recibe los elementos barajados; terminal: los archivos de texto traen su SHA-256", async () => {
    const c = await create(custody({ order: ["A", "B", "C", "D", "E"] }));
    const t = await create(terminal());
    const pc = (await request(app).get(`/api/v1/challenges/${c.body.id}`).set(bearer(player))).body.payload;
    expect(pc.items).not.toEqual(["A", "B", "C", "D", "E"]);
    expect([...pc.items].sort()).toEqual(["A", "B", "C", "D", "E"]);
    const pt = (await request(app).get(`/api/v1/challenges/${t.body.id}`).set(bearer(player))).body.payload;
    expect(pt.files.find((f: { name: string }) => f.name === "log.txt").sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("validación", () => {
  const rejects = async (body: object, path: string, message?: RegExp) => {
    const res = await request(app).post("/api/v1/admin/challenges").set(bearer(admin)).send(body);
    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(res.body.error).toBe("validation_error");
    const issue = res.body.issues.find((i: { path: (string | number)[] }) => i.path.join(".") === path);
    expect(issue, `sin error en ${path}: ${JSON.stringify(res.body.issues)}`).toBeTruthy();
    if (message) expect(issue.message).toMatch(message);
  };

  it("campos obligatorios y límites, con mensajes en español", async () => {
    await rejects({ ...phishing(), title: "" }, "title", /vacío/);
    await rejects({ ...phishing(), baseXp: 500 }, "baseXp", /Máximo 200/);
    await rejects({ ...phishing(), categoryId: "no-es-uuid" }, "categoryId", /categoría/);
    await rejects({ ...phishing(), difficultyLevel: "EXTREMA" }, "difficultyLevel", /dificultad/);
  });

  it("la ruta debe corresponder al tipo de reto", async () => {
    await rejects({ ...phishing(), track: "TECHNICAL" }, "track", /corporativa/);
    await rejects({ ...terminal(), track: "AWARENESS" }, "track", /técnica/);
  });

  it("phishing: señales coherentes con el correo", async () => {
    const noLink = { ...email, body: ["Solo texto"] };
    const noAttachment = { ...email, attachments: [] };
    await rejects(phishing({ email: noLink, indicators: ["hidden_url"] }), "content.indicators", /no tiene enlaces/);
    await rejects(phishing({ email: noAttachment, indicators: ["dangerous_attachment"] }), "content.indicators", /no tiene adjuntos/);
    await rejects(phishing({ isLegitimate: true, indicators: ["sender_spoofing"] }), "content.indicators", /legítimo/);
    await rejects(phishing({ indicators: [], isLegitimate: false }), "content.indicators", /al menos una señal/);
    await rejects(phishing({ indicators: ["sender_spoofing", "sender_spoofing"] }), "content.indicators", /repetidas/);
  });

  it("phishing: un enlace con esquema peligroso se rechaza", async () => {
    const evil = { ...email, body: ["Hola", { link: "clic", href: "javascript:alert(1)" }] };
    await rejects(phishing({ email: evil }), "content.email.body.1.href", /http/);
  });

  it("decisión rápida: opción correcta válida y sin opciones repetidas", async () => {
    await rejects(quick({ correctIndex: 5 }), "content.correctIndex", /correcta/);
    await rejects(quick({ options: ["A", "a", "B"] }), "content.options", /repetidas/);
    await rejects(quick({ options: ["Solo una"], correctIndex: 0 }), "content.options", /al menos 2/);
  });

  it("custodia: sin elementos repetidos", async () => {
    await rejects(custody({ order: ["Uno", "uno"] }), "content.order", /repetidos/);
  });

  it("terminal: archivos binarios con SHA-256, texto con contenido, nombres únicos y host válido", async () => {
    await rejects(terminal({ files: [{ name: "x.exe", binary: true }] }), "content.files.0.sha256", /SHA-256/);
    await rejects(terminal({ files: [{ name: "a.txt", binary: false }] }), "content.files.0.content", /contenido/);
    await rejects(terminal({ files: [{ name: "a.txt", binary: false, content: "x" }, { name: "a.txt", binary: false, content: "y" }] }), "content.files", /mismo nombre/);
    await rejects(terminal({ host: "sin-arroba" }), "content.host", /usuario@equipo/);
    await rejects(terminal({ verdict: "TAL VEZ" }), "content.verdict", /veredicto/);
  });

  it("título duplicado (sin distinguir mayúsculas) y categoría inexistente", async () => {
    const first = quick();
    const ok = await create(first);
    expect(ok.status).toBe(201);
    await rejects({ ...quick(), title: (first as { title: string }).title.toLowerCase() }, "title", /Ya existe/);
    await rejects({ ...quick(), categoryId: "00000000-0000-4000-8000-000000000000" }, "categoryId", /no existe/);
  });
});

describe("editar, retirar y reactivar", () => {
  it("PUT actualiza contenido y conserva el id; GET devuelve la forma editable", async () => {
    const created = await create(quick());
    const id = created.body.id;
    const body = { ...quick({ options: ["X", "Y", "Z", "W"], correctIndex: 3 }), title: title("editado"), explanationGuide: "Nueva explicación" };
    const res = await request(app).put(`/api/v1/admin/challenges/${id}`).set(bearer(admin)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    const got = (await request(app).get(`/api/v1/admin/challenges/${id}`).set(bearer(admin))).body;
    expect(got.content.options).toEqual(["X", "Y", "Z", "W"]);
    expect(got.content.correctIndex).toBe(3);
    expect(got.explanationGuide).toBe("Nueva explicación");
    const ok = await request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(player)).send({ time_taken_seconds: 3, response: { choice: "d" } });
    expect(ok.body.is_successful).toBe(true);
  });

  it("un reto editado puede conservar su propio título; uno inexistente da 404", async () => {
    const created = await create(quick());
    const same = await request(app).put(`/api/v1/admin/challenges/${created.body.id}`).set(bearer(admin)).send({ ...quick(), title: created.body.title });
    expect(same.status).toBe(200);
    expect((await request(app).put("/api/v1/admin/challenges/00000000-0000-4000-8000-000000000000").set(bearer(admin)).send(quick())).status).toBe(404);
  });

  it("retirar oculta el reto a los jugadores y bloquea intentos; reactivar lo devuelve", async () => {
    const created = await create(quick());
    const id = created.body.id;
    const off = await request(app).patch(`/api/v1/admin/challenges/${id}/active`).set(bearer(admin)).send({ isActive: false });
    expect(off.body.isActive).toBe(false);

    const list = await request(app).get("/api/v1/challenges?track=AWARENESS").set(bearer(player));
    expect(list.body.some((c: { id: string }) => c.id === id)).toBe(false);
    const attempt = await request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(player)).send({ time_taken_seconds: 3, response: { choice: "b" } });
    expect(attempt.status).toBe(404);

    const inactive = await request(app).get("/api/v1/admin/challenges?active=false").set(bearer(admin));
    expect(inactive.body.some((c: { id: string }) => c.id === id)).toBe(true);

    await request(app).patch(`/api/v1/admin/challenges/${id}/active`).set(bearer(admin)).send({ isActive: true });
    const again = await request(app).get("/api/v1/challenges?track=AWARENESS").set(bearer(player));
    expect(again.body.some((c: { id: string }) => c.id === id)).toBe(true);
  });

  it("la lista de administración incluye intentos y tasa de fallo", async () => {
    const created = await create(quick());
    const id = created.body.id;
    const fresh = await login("COLABORADOR"); // jugador propio: el compartido ya acumuló fallos
    await request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(fresh)).send({ time_taken_seconds: 3, response: { choice: "a" } });
    await request(app).post(`/api/v1/challenges/${id}/attempt`).set(bearer(fresh)).send({ time_taken_seconds: 3, response: { choice: "b" } });
    const row = (await request(app).get("/api/v1/admin/challenges?track=AWARENESS").set(bearer(admin))).body.find((c: { id: string }) => c.id === id);
    expect(row).toMatchObject({ attempts: 2, failureRate: 50, type: "quick", isActive: true });
  });
});
