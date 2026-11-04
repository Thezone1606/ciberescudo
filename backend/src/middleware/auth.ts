import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db";
import { verifyAccess, type RoleName } from "../modules/auth/tokens";
import { HttpError } from "./errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { sub: string; role: RoleName };
    }
  }
}

// Jerarquía del catálogo de endpoints: "Rol Mínimo".
const RANK: Record<RoleName, number> = { COLABORADOR: 1, ANALISTA: 2, SECOPS: 3 };

// Valida la firma y, además, consulta la BD: el usuario debe existir, su sesión no
// debe haberse revocado (token_version) y el rol que cuenta es el actual, no el de emisión.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Falta el token de autenticación", "unauthorized");
  }
  let payload;
  try {
    payload = verifyAccess(header.slice(7));
  } catch {
    throw new HttpError(401, "Token inválido o expirado", "unauthorized");
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { tokenVersion: true, isActive: true, role: { select: { name: true } } },
  });
  if (!user || !user.isActive || user.tokenVersion !== payload.ver) {
    throw new HttpError(401, "Sesión revocada", "unauthorized");
  }
  req.auth = { sub: payload.sub, role: user.role.name as RoleName };
  next();
}

export function requireRole(min: RoleName) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw new HttpError(401, "No autenticado", "unauthorized");
    if (RANK[req.auth.role] < RANK[min]) {
      throw new HttpError(403, "No tienes permiso para esta acción", "forbidden");
    }
    next();
  };
}
