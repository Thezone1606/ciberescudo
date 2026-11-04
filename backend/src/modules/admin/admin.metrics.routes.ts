import type { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db";
import { exportRows, heatmap, overview, toCsv } from "./metrics.admin.service";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha con formato AAAA-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Fecha no válida");

const filters = z
  .object({
    from: day.optional(),
    to: day.optional(),
    departmentId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    track: z.enum(["AWARENESS", "TECHNICAL"]).optional(),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, { message: "La fecha inicial no puede ser posterior a la final", path: ["from"] });

export function metricsRoutes(router: Router) {
  // Opciones para los filtros del tablero.
  router.get("/admin/filters", async (_req, res) => {
    const [departments, categories] = await Promise.all([
      prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    res.json({ departments, categories });
  });

  router.get("/admin/metrics/overview", async (req, res) => {
    res.json(await overview(filters.parse(req.query)));
  });

  router.get("/admin/metrics/heatmap", async (req, res) => {
    res.json(await heatmap(filters.parse(req.query)));
  });

  // Reporte de cumplimiento agregado (por departamento y categoría): nunca incluye personas.
  router.get("/admin/export", async (req, res) => {
    const format = z.enum(["csv", "json"]).default("json").parse(req.query.format);
    const parsed = filters.parse(req.query);
    const rows = await exportRows(parsed);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="reporte-cumplimiento-${stamp}.${format}"`);
    if (format === "csv") {
      res.type("text/csv; charset=utf-8").send(toCsv(rows));
    } else {
      res.json({ generatedAt: new Date().toISOString(), filters: parsed, rows });
    }
  });
}
