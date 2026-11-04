import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();

describe("API base", () => {
  it("GET /api/v1/health responde ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("ruta inexistente devuelve 404 JSON y no 401", async () => {
    const res = await request(app).get("/api/v1/nada");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("Swagger está disponible en /docs/", async () => {
    const res = await request(app).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger");
  });
});
