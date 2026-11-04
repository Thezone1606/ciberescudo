import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { changePassword, getProfile, login, logout, MIN_PASSWORD_LENGTH, refresh } from "./auth.service";

export const authRouter = Router();

const loginBody = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(200) });
const refreshBody = z.object({ refreshToken: z.string().min(10) });

authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = loginBody.parse(req.body);
  res.json(await login(email, password));
});

authRouter.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = refreshBody.parse(req.body);
  res.json(await refresh(refreshToken));
});

authRouter.post("/auth/logout", requireAuth, async (req, res) => {
  await logout(req.auth!.sub);
  res.status(204).end();
});

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`).max(200),
});

authRouter.post("/auth/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = passwordBody.parse(req.body);
  await changePassword(req.auth!.sub, currentPassword, newPassword);
  res.status(204).end();
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  res.json(await getProfile(req.auth!.sub));
});
