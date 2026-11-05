import argon2 from "argon2";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "../../db";
import { HttpError } from "../../middleware/errors";
import { recoverShield } from "../gamification/rules";
import { REFRESH_TTL_SECONDS, signAccess, signRefresh, verifyRefresh, type RoleName } from "./tokens";

const userInclude = { role: true, department: true } as const;

// Hash de relleno para que el login de un correo inexistente tarde lo mismo que uno real.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= argon2.hash("relleno-anti-enumeracion", { type: argon2.argon2id }));

export function toProfile(u: {
  id: string;
  email: string;
  fullName: string;
  currentXp: number;
  currentStreak: number;
  shieldIntegrity: number;
  cooldownUntil: Date | null;
  role: { name: string };
  department: { id: string; name: string };
}) {
  // Vista del estado: si el enfriamiento ya terminó, el escudo se muestra restaurado
  // (la BD se actualiza en el siguiente intento).
  const view = recoverShield(
    { xp: u.currentXp, streak: u.currentStreak, shield: u.shieldIntegrity, cooldownUntil: u.cooldownUntil, lastActivityDay: null },
    new Date(),
  );
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role.name as RoleName,
    department: u.department,
    currentXp: u.currentXp,
    currentStreak: u.currentStreak,
    shieldIntegrity: view.shield,
    cooldownUntil: view.cooldownUntil,
  };
}

// Emite un par de tokens y registra el refresh (un solo uso) en la BD.
async function issueTokens(u: { id: string; tokenVersion: number }, familyId: string = randomUUID()) {
  const jti = randomUUID();
  await prisma.refreshToken.create({
    data: { id: jti, userId: u.id, familyId, expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000) },
  });
  return {
    accessToken: signAccess(u.id, u.tokenVersion),
    refreshToken: signRefresh(u.id, u.tokenVersion, jti),
    tokenType: "Bearer" as const,
  };
}

// Invalida todas las sesiones del usuario: sube la versión (mata los access) y borra los refresh.
async function revokeAllSessions(userId: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
}

export async function login(email: string, password: string, portal?: "admin" | "user") {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: userInclude });
  const ok = await argon2.verify(user?.passwordHash ?? (await getDummyHash()), password).catch(() => false);
  // Una cuenta desactivada responde igual que una contraseña incorrecta: no revela que existe.
  if (!user || !ok || !user.isActive) throw new HttpError(401, "Correo o contraseña incorrectos", "invalid_credentials");
  // Solo después de verificar la contraseña: no se revela qué correos existen. No se emiten tokens ni se registra el acceso.
  if (portal === "admin" && user.role.name !== "SECOPS") throw new HttpError(403, "Esta cuenta no tiene acceso al portal de administración", "wrong_portal");
  if (portal === "user" && user.role.name === "SECOPS") throw new HttpError(403, "Las cuentas de administración entran por el portal de administración", "wrong_portal");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
  return { ...(await issueTokens(user)), user: toProfile(user) };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw new HttpError(401, "Refresh token inválido o expirado", "unauthorized");
  }
  const invalid = () => new HttpError(401, "Sesión revocada", "unauthorized");

  const row = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!row || row.userId !== payload.sub || row.expiresAt < new Date()) throw invalid();

  // Reutilización: ese token ya se canjeó. Puede haber sido robado, así que se cierran todas las sesiones.
  if (row.usedAt) {
    await revokeAllSessions(row.userId);
    throw invalid();
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive || user.tokenVersion !== payload.ver) throw invalid();

  // Canje atómico: si dos peticiones llegan a la vez, solo una gana.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) {
    await revokeAllSessions(row.userId);
    throw invalid();
  }
  return issueTokens(user, row.familyId);
}

export async function logout(userId: string) {
  await revokeAllSessions(userId);
}

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 12;

/**
 * Cambia la contraseña de quien tiene la sesión. Exige la actual y cierra TODAS las sesiones (también esta):
 * si alguien más la conocía, deja de servirle. La persona vuelve a iniciar sesión con la nueva.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, "Usuario no encontrado", "unauthorized");
  if (!(await argon2.verify(user.passwordHash, currentPassword).catch(() => false))) {
    throw new HttpError(400, "La contraseña actual no es correcta", "wrong_password");
  }
  if (newPassword === currentPassword) throw new HttpError(400, "La contraseña nueva debe ser distinta de la actual", "same_password");
  if (newPassword.toLowerCase().includes(user.email.split("@")[0].toLowerCase())) {
    throw new HttpError(400, "La contraseña no debe contener tu nombre de usuario", "weak_password");
  }
  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw new HttpError(401, "Usuario no encontrado", "unauthorized");
  return toProfile(user);
}

// --- Registro propio (sign-up) -------------------------------------------------------------------
// Solo está abierto si SIGNUP_ALLOWED_DOMAINS lista al menos un dominio. Sin verificación por correo, ese filtro
// (y, opcionalmente, un código que da el administrador) es lo que decide quién puede registrarse. Siempre COLABORADOR.

/** Se lee en cada petición, no al arrancar: así se puede cambiar la configuración sin tocar el código. */
export function signupConfig() {
  const domains = (process.env.SIGNUP_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  const code = process.env.SIGNUP_CODE?.trim() ?? "";
  // Con «*» se acepta cualquier dominio (correos de prueba o ficticios); sigue validándose que sea un correo bien formado.
  return { enabled: domains.length > 0, domains, anyDomain: domains.includes("*"), code, requiresCode: code.length > 0 };
}

export async function signupInfo() {
  const cfg = signupConfig();
  const departments = cfg.enabled ? await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
  return { enabled: cfg.enabled, requiresCode: cfg.requiresCode, anyDomain: cfg.anyDomain, domains: cfg.domains, departments };
}

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  departmentId: string;
  code?: string;
}

export async function signup(input: SignupInput) {
  const cfg = signupConfig();
  if (!cfg.enabled) throw new HttpError(403, "El registro no está abierto. Pide a tu administrador que te invite.", "signup_disabled");
  if (cfg.requiresCode && !sameSecret(input.code ?? "", cfg.code)) throw new HttpError(403, "El código de registro no es correcto", "invalid_code");

  const email = input.email.toLowerCase();
  if (!cfg.anyDomain && !cfg.domains.includes(email.split("@")[1])) {
    throw new HttpError(400, `Usa tu correo corporativo (@${cfg.domains.join(" o @")})`, "email_domain_not_allowed");
  }
  if (input.password.toLowerCase().includes(email.split("@")[0])) {
    throw new HttpError(400, "La contraseña no debe contener tu nombre de usuario", "weak_password");
  }
  const [department, role] = await Promise.all([
    prisma.department.findUnique({ where: { id: input.departmentId } }),
    prisma.role.findUniqueOrThrow({ where: { name: "COLABORADOR" } }),
  ]);
  if (!department) throw new HttpError(400, "El departamento no existe", "invalid_department");
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, "Ya existe una cuenta con ese correo. Inicia sesión.", "email_taken");
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const user = await prisma.user
    .create({
      data: { email, fullName: input.fullName.trim(), passwordHash, roleId: role.id, departmentId: department.id, lastLoginAt: new Date() },
      include: userInclude,
    })
    .catch((e: { code?: string }) => {
      if (e.code === "P2002") throw new HttpError(409, "Ya existe una cuenta con ese correo. Inicia sesión.", "email_taken");
      throw e;
    });
  return { ...(await issueTokens(user)), user: toProfile(user) };
}
