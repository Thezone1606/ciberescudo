import argon2 from "argon2";
import { prisma } from "../../db";
import { HttpError } from "../../middleware/errors";
import { generatePassword } from "../pilot/pilot-users";
import { getPhase } from "../pilot/pilot.service";

export type UserStatus = "new" | "existing";

export interface UserFilters {
  status?: UserStatus;
  departmentId?: string;
  search?: string;
}

/** «Nuevo» = todavía no ha iniciado sesión nunca; «existente» = ya entró al menos una vez. */
export async function listUsers(f: UserFilters) {
  const search = f.search?.trim();
  const users = await prisma.user.findMany({
    where: {
      ...(f.status === "new" ? { lastLoginAt: null } : f.status === "existing" ? { lastLoginAt: { not: null } } : {}),
      ...(f.departmentId ? { departmentId: f.departmentId } : {}),
      ...(search
        ? { OR: [{ fullName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
        : {}),
    },
    include: { role: true, department: true, susResponse: { select: { id: true } } },
    orderBy: [{ fullName: "asc" }],
  });
  const ids = users.map((u) => u.id);

  const [solved, totals, activity, diagnostic, diagnosticTotal, pilotPhase] = await Promise.all([
    prisma.$queryRaw<{ user_id: string; track: string; n: bigint }[]>`
      SELECT a.user_id, c.track::text AS track, COUNT(DISTINCT a.challenge_id) AS n
      FROM attempts a JOIN challenges c ON c.id = a.challenge_id
      WHERE a.user_id = ANY(${ids}::uuid[]) AND a.is_successful AND a.phase = 'PRACTICE'::"AttemptPhase" AND c.is_diagnostic = false
      GROUP BY a.user_id, c.track`,
    prisma.$queryRaw<{ track: string; n: bigint }[]>`
      SELECT track::text AS track, COUNT(*) AS n FROM challenges WHERE is_active AND NOT is_diagnostic GROUP BY track`,
    prisma.$queryRaw<{ user_id: string; attempts: bigint; successes: bigint; last_at: Date | null }[]>`
      SELECT user_id, COUNT(*) AS attempts, COUNT(*) FILTER (WHERE is_successful) AS successes, MAX(created_at) AS last_at
      FROM attempts WHERE user_id = ANY(${ids}::uuid[]) AND phase = 'PRACTICE'::"AttemptPhase" GROUP BY user_id`,
    prisma.$queryRaw<{ user_id: string; phase: string; n: bigint }[]>`
      SELECT user_id, phase::text AS phase, COUNT(*) AS n
      FROM attempts WHERE user_id = ANY(${ids}::uuid[]) AND phase <> 'PRACTICE'::"AttemptPhase" GROUP BY user_id, phase`,
    prisma.challenge.count({ where: { isActive: true, isDiagnostic: true } }),
    getPhase(),
  ]);

  const total = (track: string) => Number(totals.find((t) => t.track === track)?.n ?? 0);
  const solvedOf = (id: string, track: string) => Number(solved.find((s) => s.user_id === id && s.track === track)?.n ?? 0);
  const diagOf = (id: string, phase: string) => Number(diagnostic.find((d) => d.user_id === id && d.phase === phase)?.n ?? 0);

  return {
    totals: { awareness: total("AWARENESS"), technical: total("TECHNICAL"), diagnostic: diagnosticTotal, pilotPhase },
    users: users.map((u) => {
      const act = activity.find((a) => a.user_id === u.id);
      const attempts = Number(act?.attempts ?? 0);
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role.name,
        department: u.department,
        isActive: u.isActive,
        status: (u.lastLoginAt ? "existing" : "new") as UserStatus,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        xp: u.currentXp,
        streak: u.currentStreak,
        shield: u.shieldIntegrity,
        solvedAwareness: solvedOf(u.id, "AWARENESS"),
        solvedTechnical: solvedOf(u.id, "TECHNICAL"),
        attempts,
        successRate: attempts ? Math.round((Number(act!.successes) / attempts) * 1000) / 10 : null,
        lastAttemptAt: act?.last_at ?? null,
        baselineDone: diagnosticTotal > 0 && diagOf(u.id, "BASELINE") >= diagnosticTotal,
        posttestDone: diagnosticTotal > 0 && diagOf(u.id, "POSTTEST") >= diagnosticTotal,
        susDone: !!u.susResponse,
      };
    }),
  };
}

export interface UserPatch {
  fullName?: string;
  departmentId?: string;
  role?: "COLABORADOR" | "ANALISTA" | "SECOPS";
  isActive?: boolean;
}

/** Edita nombre, departamento, rol y estado. No permite que un administrador se quite su propio acceso. */
export async function updateUser(actorId: string, id: string, patch: UserPatch) {
  const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!user) throw new HttpError(404, "Usuario no encontrado", "not_found");
  if (id === actorId && (patch.isActive === false || (patch.role && patch.role !== "SECOPS"))) {
    throw new HttpError(409, "No puedes desactivar tu cuenta ni quitarte el rol de administrador", "self_lockout");
  }
  const data: Record<string, unknown> = {};
  if (patch.fullName !== undefined) data.fullName = patch.fullName.trim();
  if (patch.departmentId) {
    if (!(await prisma.department.findUnique({ where: { id: patch.departmentId } }))) throw new HttpError(400, "El departamento no existe", "invalid_department");
    data.departmentId = patch.departmentId;
  }
  if (patch.role && patch.role !== user.role.name) {
    data.roleId = (await prisma.role.findUniqueOrThrow({ where: { name: patch.role } })).id;
  }
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  const closeSessions = patch.isActive === false;
  if (closeSessions) data.tokenVersion = { increment: 1 };

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data }),
    ...(closeSessions ? [prisma.refreshToken.deleteMany({ where: { userId: id } })] : []),
  ]);
  return (await listUsers({ search: user.email })).users.find((u) => u.id === id)!;
}

/** Genera una contraseña nueva: se devuelve una sola vez y se cierran todas las sesiones de la persona. */
export async function resetPassword(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "Usuario no encontrado", "not_found");
  const password = generatePassword();
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash, tokenVersion: { increment: 1 }, lastLoginAt: null } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);
  return { email: user.email, fullName: user.fullName, password };
}
