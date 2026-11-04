import "dotenv/config"; // DATABASE_URL real antes de armar la configuración de prueba
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const good = {
  NODE_ENV: "production",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://x:y@localhost:5432/z",
  JWT_ACCESS_SECRET: "acceso-4f8a1c9e7b2d6035a8c1e4f79b3d2a60c5e8",
  JWT_REFRESH_SECRET: "refresh-9d3b7e1a5c4f8260b7d9a3e1c5f4802b6a9d",
};

// env.ts lee process.env al importarse: cada caso reinicia los módulos y prueba otra configuración.
async function load(over: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ ...good, ...over })) vi.stubEnv(k, v);
  return import("../src/config/env.js");
}

afterEach(() => vi.unstubAllEnvs());

describe("configuración de producción", () => {
  it("acepta secretos propios y distintos", async () => {
    const { env } = await load();
    expect(env.NODE_ENV).toBe("production");
  });

  it("se niega a arrancar con secretos de ejemplo", async () => {
    await expect(load({ JWT_ACCESS_SECRET: "cambia-este-secreto-de-acceso-minimo-32-caracteres" })).rejects.toThrow(/valor de ejemplo/);
    await expect(load({ JWT_REFRESH_SECRET: "changeme-changeme-changeme-changeme-1234" })).rejects.toThrow(/valor de ejemplo/);
  });

  it("se niega a arrancar si los dos secretos son iguales o muy cortos", async () => {
    await expect(load({ JWT_REFRESH_SECRET: good.JWT_ACCESS_SECRET })).rejects.toThrow(/distinto/);
    await expect(load({ JWT_ACCESS_SECRET: "corto" })).rejects.toThrow();
  });

  it("en desarrollo los secretos de ejemplo siguen permitidos", async () => {
    const { env } = await load({ NODE_ENV: "development", JWT_ACCESS_SECRET: "cambia-este-secreto-de-acceso-minimo-32-caracteres" });
    expect(env.NODE_ENV).toBe("development");
  });

  it("DOCS_ENABLED y TRUST_PROXY: por defecto, documentación solo fuera de producción y sin confiar en proxy", async () => {
    expect((await load()).env).toMatchObject({ DOCS_ENABLED: false, TRUST_PROXY: false });
    expect((await load({ NODE_ENV: "development" })).env.DOCS_ENABLED).toBe(true);
    expect((await load({ TRUST_PROXY: "true", DOCS_ENABLED: "true" })).env).toMatchObject({ TRUST_PROXY: true, DOCS_ENABLED: true });
  });

  it("valores no booleanos en DOCS_ENABLED se rechazan", async () => {
    await expect(load({ DOCS_ENABLED: "quizas" })).rejects.toThrow();
  });
});

describe("aplicación en producción", () => {
  it("/docs no existe y la salud con base de datos responde", async () => {
    await load();
    const { createApp } = await import("../src/app.js");
    const app = createApp();
    expect((await request(app).get("/docs/")).status).toBe(404);
    expect((await request(app).get("/api/v1/health")).body).toEqual({ status: "ok" });
    const ready = await request(app).get("/api/v1/health/ready");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready" });
    const { prisma } = await import("../src/db.js");
    await prisma.$disconnect();
  });

  it("con DOCS_ENABLED=true la documentación sí se sirve", async () => {
    await load({ DOCS_ENABLED: "true" });
    const { createApp } = await import("../src/app.js");
    expect((await request(createApp()).get("/docs/")).status).toBe(200);
    const { prisma } = await import("../src/db.js");
    await prisma.$disconnect();
  });
});
