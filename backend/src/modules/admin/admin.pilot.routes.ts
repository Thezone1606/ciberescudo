import type { Router } from "express";
import { z } from "zod";
import { PHASES, setPhase } from "../pilot/pilot.service";
import { pilotOverview, pilotReport, reportRows } from "../pilot/pilot.report";
import { csvCell } from "./metrics.admin.service";

export function pilotAdminRoutes(router: Router) {
  router.get("/admin/pilot", async (_req, res) => {
    res.json(await pilotOverview());
  });

  // Cambia la fase del piloto: OFF → BASELINE → PRACTICE → POSTTEST → CLOSED (o de vuelta a OFF).
  router.put("/admin/pilot/phase", async (req, res) => {
    const { phase } = z.object({ phase: z.enum(PHASES) }).parse(req.body);
    await setPhase(phase);
    res.json(await pilotOverview());
  });

  // Reporte de resultados del piloto: solo agregados, nunca personas.
  router.get("/admin/pilot/report", async (req, res) => {
    const format = z.enum(["csv", "json"]).default("json").parse(req.query.format);
    const report = await pilotReport();
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="reporte-piloto-${stamp}.${format}"`);
    if (format === "json") return void res.json(report);
    const lines = [["Indicador", "Valor", "Detalle"], ...reportRows(report)].map((row) => row.map((c) => csvCell(c as string | number | null)).join(","));
    res.type("text/csv; charset=utf-8").send("﻿" + lines.join("\r\n") + "\r\n");
  });
}
