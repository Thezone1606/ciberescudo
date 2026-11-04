import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { metricsRoutes } from "./admin.metrics.routes";
import { pilotAdminRoutes } from "./admin.pilot.routes";
import { usersAdminRoutes } from "./admin.users.routes";
import { challengeInput } from "./challenge-input";
import {
  createChallenge,
  getAdminChallenge,
  listAdminChallenges,
  setChallengeActive,
  updateChallenge,
} from "./challenges.admin.service";

export const adminRouter = Router();

// Todo /admin/* exige SECOPS.
adminRouter.use("/admin", requireAuth, requireRole("SECOPS"));

adminRouter.get("/admin/ping", (_req, res) => {
  res.json({ status: "ok", scope: "admin" });
});

const idParam = z.object({ id: z.string().uuid() });
const listQuery = z.object({
  track: z.enum(["AWARENESS", "TECHNICAL"]).optional(),
  active: z.enum(["true", "false"]).optional(),
});

adminRouter.get("/admin/challenges", async (req, res) => {
  const { track, active } = listQuery.parse(req.query);
  res.json(await listAdminChallenges({ track, active: active === undefined ? undefined : active === "true" }));
});

adminRouter.get("/admin/challenges/:id", async (req, res) => {
  res.json(await getAdminChallenge(idParam.parse(req.params).id));
});

adminRouter.post("/admin/challenges", async (req, res) => {
  res.status(201).json(await createChallenge(challengeInput.parse(req.body)));
});

adminRouter.put("/admin/challenges/:id", async (req, res) => {
  res.json(await updateChallenge(idParam.parse(req.params).id, challengeInput.parse(req.body)));
});

// Los retos no se borran (los intentos históricos los referencian): se retiran o se reactivan.
adminRouter.patch("/admin/challenges/:id/active", async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  res.json(await setChallengeActive(idParam.parse(req.params).id, isActive));
});

metricsRoutes(adminRouter);
pilotAdminRoutes(adminRouter);
usersAdminRoutes(adminRouter);
