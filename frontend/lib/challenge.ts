import type { Challenge } from "./types";
import type { TermFile } from "./terminal/engine";

// Formas de `payload` que entrega la API para cada tipo de reto (nunca incluye la solución).
export type EmailBlock = string | { link: string; href: string };

export interface Email {
  fromName: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: EmailBlock[];
  attachments: { name: string; size: string }[];
}

export interface PhishingPayload {
  type: "phishing";
  email: Email;
}
export interface QuickPayload {
  type: "quick";
  scenario: string;
  question: string;
  options: { id: string; text: string }[];
}
export interface CustodyPayload {
  type: "custody";
  scenario: string;
  items: string[];
}
export interface TerminalPayload {
  type: "terminal";
  host: string;
  cwd: string;
  scenario: string;
  objective: string;
  files: TermFile[];
  whois: Record<string, string>;
}
export type ChallengePayload = PhishingPayload | QuickPayload | CustodyPayload | TerminalPayload;

export type ChallengeDetail = Omit<Challenge, "solved"> & { payload: ChallengePayload };

/** Resultado de `POST /challenges/:id/attempt`. */
export interface AttemptResult {
  is_successful: boolean;
  xp_awarded: number;
  current_xp: number;
  current_streak: number;
  shield_integrity: number;
  cooldown_until: string | null;
  feedback: string;
  explanation_guide: string;
}

/** Respuesta que cada módulo entrega a la pantalla para enviarla al backend. */
export type AttemptResponse = Record<string, unknown>;
