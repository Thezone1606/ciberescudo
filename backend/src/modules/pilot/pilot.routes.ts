import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { nextDiagnostic, pilotStatus, submitDiagnostic, submitSus, susStatus } from "./pilot.service";

export const pilotRouter = Router();

const idParam = z.object({ id: z.string().uuid() });
const diagnosticBody = z.object({
  time_taken_seconds: z.number().int().min(0).max(3600),
  response: z.record(z.string(), z.unknown()),
});
const susBody = z.object({ answers: z.array(z.number().int().min(1).max(5)).length(10) });

pilotRouter.get("/pilot/status", requireAuth, async (req, res) => {
  res.json(await pilotStatus(req.auth!.sub));
});

pilotRouter.get("/pilot/diagnostic", requireAuth, async (req, res) => {
  res.json(await nextDiagnostic(req.auth!.sub));
});

pilotRouter.post("/pilot/diagnostic/:id", requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { time_taken_seconds, response } = diagnosticBody.parse(req.body);
  res.status(201).json(await submitDiagnostic(req.auth!.sub, id, { timeTakenSeconds: time_taken_seconds, response }));
});

pilotRouter.get("/pilot/sus", requireAuth, async (req, res) => {
  res.json(await susStatus(req.auth!.sub));
});

pilotRouter.post("/pilot/sus", requireAuth, async (req, res) => {
  const { answers } = susBody.parse(req.body);
  res.status(201).json(await submitSus(req.auth!.sub, answers));
});
