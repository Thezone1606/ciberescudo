import type { Difficulty, Track } from "./types";

export interface AdminChallengeRow {
  id: string;
  title: string;
  track: Track;
  type: ContentType;
  category: string;
  categoryId: string;
  difficulty: Difficulty;
  baseXp: number;
  orderIndex: number;
  isActive: boolean;
  isDiagnostic: boolean;
  attempts: number;
  failureRate: number | null;
}

export type ContentType = "phishing" | "quick" | "custody" | "terminal";

export const TYPE_LABEL: Record<ContentType, string> = {
  phishing: "Correo de phishing",
  quick: "Decisión rápida",
  custody: "Cadena de custodia",
  terminal: "Terminal forense",
};
export const TYPE_TRACK: Record<ContentType, Track> = { phishing: "AWARENESS", quick: "AWARENESS", custody: "TECHNICAL", terminal: "TECHNICAL" };
export const TRACK_LABEL: Record<Track, string> = { AWARENESS: "Corporativa", TECHNICAL: "Técnica" };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { BASIC: "Básico", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado" };
export const DEFAULT_XP: Record<Difficulty, number> = { BASIC: 10, INTERMEDIATE: 25, ADVANCED: 50 };

// Forma editable de un reto (la misma que valida el backend).
export type EmailBlock = string | { link: string; href: string };
export interface PhishingContent {
  type: "phishing";
  email: { fromName: string; from: string; to: string; subject: string; date: string; body: EmailBlock[]; attachments: { name: string; size: string }[] };
  indicators: string[];
  isLegitimate: boolean;
}
export interface QuickContent { type: "quick"; scenario: string; question: string; options: string[]; correctIndex: number }
export interface CustodyContent { type: "custody"; scenario: string; order: string[] }
export interface TerminalFileInput { name: string; binary: boolean; content?: string; sha256?: string; size?: string }
export interface TerminalContent {
  type: "terminal";
  host: string;
  cwd: string;
  scenario: string;
  objective: string;
  files: TerminalFileInput[];
  /** En el formulario es una lista (editable fila por fila); la API recibe un objeto dominio → texto. */
  whois: { domain: string; text: string }[];
  verdict: "CONFIRMED" | "FALSE_POSITIVE" | "";
}
export type Content = PhishingContent | QuickContent | CustodyContent | TerminalContent;

export interface ChallengeForm {
  title: string;
  categoryId: string;
  track: Track;
  difficultyLevel: Difficulty;
  baseXp: string; // vacío = XP por defecto de la dificultad
  orderIndex: string; // vacío = al final de la ruta
  explanationGuide: string;
  isActive: boolean;
  /** Reto del diagnóstico del piloto: no aparece en la práctica. */
  isDiagnostic: boolean;
  content: Content;
}

export function emptyContent(type: ContentType): Content {
  switch (type) {
    case "phishing":
      return { type, email: { fromName: "", from: "", to: "tu.nombre@dsintelligence.com", subject: "", date: "", body: [""], attachments: [] }, indicators: [], isLegitimate: false };
    case "quick":
      return { type, scenario: "", question: "", options: ["", ""], correctIndex: 0 };
    case "custody":
      return { type, scenario: "", order: ["", ""] };
    case "terminal":
      return { type, host: "analista@dsi-lab", cwd: "~/caso", scenario: "", objective: "", files: [{ name: "", binary: false, content: "" }], whois: [], verdict: "" };
  }
}

export function emptyForm(type: ContentType = "phishing"): ChallengeForm {
  return { title: "", categoryId: "", track: TYPE_TRACK[type], difficultyLevel: "BASIC", baseXp: "", orderIndex: "", explanationGuide: "", isActive: true, isDiagnostic: false, content: emptyContent(type) };
}

/** Convierte el formulario al cuerpo que espera la API (números vacíos se omiten). */
export function toRequest(f: ChallengeForm) {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const content =
    f.content.type === "terminal"
      ? { ...f.content, whois: Object.fromEntries(f.content.whois.filter((w) => w.domain.trim() || w.text.trim()).map((w) => [w.domain, w.text])) }
      : f.content;
  return { ...f, content, baseXp: num(f.baseXp), orderIndex: num(f.orderIndex) };
}

/** Respuesta de `GET /admin/challenges/:id` → estado del formulario. */
export function fromApi(c: {
  title: string; categoryId: string; track: Track; difficultyLevel: Difficulty; baseXp: number; orderIndex: number;
  explanationGuide: string; isActive: boolean; isDiagnostic: boolean; content: Omit<TerminalContent, "whois"> & { whois?: Record<string, string> } | Exclude<Content, TerminalContent>;
}): ChallengeForm {
  const content: Content =
    c.content.type === "terminal"
      ? { ...c.content, whois: Object.entries(c.content.whois ?? {}).map(([domain, text]) => ({ domain, text })) }
      : c.content;
  return { title: c.title, categoryId: c.categoryId, track: c.track, difficultyLevel: c.difficultyLevel, baseXp: String(c.baseXp), orderIndex: String(c.orderIndex), explanationGuide: c.explanationGuide, isActive: c.isActive, isDiagnostic: c.isDiagnostic, content };
}

export interface ApiIssue { path: (string | number)[]; message: string }

/** Errores de validación del backend → mapa «ruta → mensaje» (se conserva el primero de cada campo). */
export function issuesToErrors(issues: ApiIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.join(".");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

export interface HeatCell { departmentId: string; categoryId: string; attempts: number; failures: number; rate: number | null; level: "green" | "yellow" | "red" | "insufficient" }
export interface Heatmap { departments: { id: string; name: string }[]; categories: { id: string; name: string }[]; cells: HeatCell[]; minAttempts: number; thresholds: { green: number; yellow: number } }
export interface Overview {
  players: number;
  adoption: { activeLast7Days: number; rate: number | null };
  streakAdherence: { users: number; rate: number | null };
  mttdSeconds: number | null;
  averageShield: number | null;
  attempts: number;
  failureRate: number | null;
}
export interface Filters { departments: { id: string; name: string }[]; categories: { id: string; name: string }[] }
