export type UserRole = "COLABORADOR" | "ANALISTA" | "SECOPS";

export const ROLE_LABEL: Record<UserRole, string> = { COLABORADOR: "Colaborador", ANALISTA: "Analista técnico", SECOPS: "Administrador" };

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: { id: string; name: string };
  isActive: boolean;
  status: "new" | "existing";
  createdAt: string;
  lastLoginAt: string | null;
  xp: number;
  streak: number;
  shield: number;
  solvedAwareness: number;
  solvedTechnical: number;
  attempts: number;
  successRate: number | null;
  lastAttemptAt: string | null;
  baselineDone: boolean;
  posttestDone: boolean;
  susDone: boolean;
}

export interface UsersResponse {
  totals: { awareness: number; technical: number; diagnostic: number; pilotPhase: string };
  users: AdminUser[];
}

const dateFormat = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

/** Fecha corta en hora de la Ciudad de México; «—» si no hay dato. */
export function shortDate(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : "—";
}
