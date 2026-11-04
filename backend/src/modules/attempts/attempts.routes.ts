import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { submitAttempt } from "./attempts.service";

export const attemptsRouter = Router();

const idParam = z.object({ id: z.string().uuid() });
const body = z.object({
  time_taken_seconds: z.number().int().min(0).max(3600),
  response: z.record(z.string(), z.unknown()),
});

attemptsRouter.post("/challenges/:id/attempt", requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { time_taken_seconds, response } = body.parse(req.body);
  res.json(await submitAttempt(req.auth!.sub, id, { timeTakenSeconds: time_taken_seconds, response }));
});
