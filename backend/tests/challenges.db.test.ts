import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { loginAs } from "./helpers";

const app = createApp();
let auth: { Authorization: string };

beforeAll(async () => {
  const { accessToken } = await loginAs(app, "colaborador");
  auth = { Authorization: `Bearer ${accessToken}` };
});

afterAll(() => prisma.$disconnect());

describe("catálogo de retos (BD real)", () => {
  it("el seed dejó 5 departamentos, 3 roles y 6 categorías", async () => {
    const [d, r, c] = await Promise.all([
      prisma.department.count(),
      prisma.role.count(),
      prisma.category.count(),
    ]);
    expect([d, r, c]).toEqual([5, 3, 6]);
  });

  it("sin token los endpoints de retos devuelven 401", async () => {
    for (const path of ["/challenges", "/categories"]) {
      const res = await request(app).get(`/api/v1${path}`);
      expect(res.status).toBe(401);
    }
  });

  it("lista retos por ruta y nunca expone solución ni explicación", async () => {
    const res = await request(app).get("/api/v1/challenges?track=AWARENESS").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const c of res.body) {
      expect(c.track).toBe("AWARENESS");
      expect(c).not.toHaveProperty("solution");
      expect(c).not.toHaveProperty("explanationGuide");
    }
  });

  it("track inválido devuelve 400", async () => {
    const res = await request(app).get("/api/v1/challenges?track=OTRO").set(auth);
    expect(res.status).toBe(400);
  });

  it("detalle de un reto no incluye la solución", async () => {
    const list = await request(app).get("/api/v1/challenges").set(auth);
    const res = await request(app).get(`/api/v1/challenges/${list.body[0].id}`).set(auth);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/solution|explanation/i);
  });

  it("id inexistente devuelve 404 y no-UUID devuelve 400", async () => {
    const missing = await request(app)
      .get("/api/v1/challenges/00000000-0000-4000-8000-000000000000")
      .set(auth);
    expect(missing.status).toBe(404);
    expect((await request(app).get("/api/v1/challenges/abc").set(auth)).status).toBe(400);
  });

  it("catálogo de categorías", async () => {
    const res = await request(app).get("/api/v1/categories").set(auth);
    expect(res.body).toHaveLength(6);
  });
});
