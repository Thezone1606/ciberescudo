import type { Router } from "express";
import { z } from "zod";
import { inviteUsers, listUsers, resetPassword, updateUser } from "./users.admin.service";

const idParam = z.object({ id: z.string().uuid() });
const personInput = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    fullName: z.string().trim().min(2).max(150),
    departmentId: z.string().uuid(),
    role: z.enum(["COLABORADOR", "ANALISTA"]).default("COLABORADOR"),
  })
  .strict();

export function usersAdminRoutes(router: Router) {
  router.get("/admin/users", async (req, res) => {
    const q = z
      .object({
        status: z.enum(["new", "existing"]).optional(),
        department: z.string().uuid().optional(),
        search: z.string().max(100).optional(),
      })
      .parse(req.query);
    res.json(await listUsers({ status: q.status, departmentId: q.department, search: q.search }));
  });

  // Invita a una o varias personas: crea las cuentas con contraseña inicial aleatoria, que se devuelve una sola vez.
  // Admite una lista (`people`) o el mismo CSV del alta masiva (`csv`). Si algo no es válido no se crea a nadie.
  router.post("/admin/users/invite", async (req, res) => {
    const body = z.union([z.object({ people: z.array(personInput).min(1).max(200) }).strict(), z.object({ csv: z.string().min(1).max(100_000) }).strict()]).parse(req.body);
    const result = await inviteUsers(body);
    res.status(result.errors.length ? 400 : 201).json(result);
  });

  router.patch("/admin/users/:id", async (req, res) => {
    const patch = z
      .object({
        fullName: z.string().trim().min(2).max(150).optional(),
        departmentId: z.string().uuid().optional(),
        role: z.enum(["COLABORADOR", "ANALISTA", "SECOPS"]).optional(),
        isActive: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    res.json(await updateUser(req.auth!.sub, idParam.parse(req.params).id, patch));
  });

  // La contraseña nueva se muestra una sola vez: no se guarda en claro ni se registra.
  router.post("/admin/users/:id/reset-password", async (req, res) => {
    res.json(await resetPassword(idParam.parse(req.params).id));
  });
}
