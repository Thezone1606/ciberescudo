import type { Router } from "express";
import { z } from "zod";
import { listUsers, resetPassword, updateUser } from "./users.admin.service";

const idParam = z.object({ id: z.string().uuid() });

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
