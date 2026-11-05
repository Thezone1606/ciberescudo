import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { changePassword, getProfile, login, logout, MIN_PASSWORD_LENGTH, refresh, signup, signupInfo } from "./auth.service";

export const authRouter = Router();

// `portal` separa las dos entradas: la de administración solo admite cuentas SECOPS y la de usuarios, las demás.
const loginBody = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(200), portal: z.enum(["admin", "user"]).optional() });
const refreshBody = z.object({ refreshToken: z.string().min(10) });

authRouter.post("/auth/login", async (req, res) => {
  const { email, password, portal } = loginBody.parse(req.body);
  res.json(await login(email, password, portal));
});

// Registro propio: público. Siempre crea un COLABORADOR; el rol no se puede pedir.
const signupBody = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(255),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`).max(200),
    departmentId: z.string().uuid(),
    code: z.string().max(100).optional(),
  })
  .strict();

authRouter.get("/auth/signup-info", async (_req, res) => {
  res.json(await signupInfo());
});

authRouter.post("/auth/signup", async (req, res) => {
  res.status(201).json(await signup(signupBody.parse(req.body)));
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
