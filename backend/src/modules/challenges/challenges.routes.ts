import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errors";
import { getChallenge, listCategories, listChallenges } from "./challenges.service";

export const challengesRouter = Router();

const listQuery = z.object({ track: z.enum(["AWARENESS", "TECHNICAL"]).optional() });
const idParam = z.object({ id: z.string().uuid() });

challengesRouter.get("/challenges", requireAuth, async (req, res) => {
  const { track } = listQuery.parse(req.query);
  res.json(await listChallenges(req.auth!.sub, track));
});

challengesRouter.get("/challenges/:id", requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const challenge = await getChallenge(id);
  if (!challenge) throw new HttpError(404, "Reto no encontrado", "not_found");
  res.json(challenge);
});

challengesRouter.get("/categories", requireAuth, async (_req, res) => {
  res.json(await listCategories());
});
