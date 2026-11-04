import type { Difficulty, Track } from "@prisma/client";
import { BASE_XP } from "../../src/modules/gamification/rules";

export interface SeedChallenge {
  title: string;
  category: string;
  track: Track;
  difficultyLevel: Difficulty;
  baseXp: number;
  orderIndex: number;
  payloadConfig: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanationGuide: string;
  /** Reto del diagnóstico (inicial y final): no aparece en la práctica. */
  isDiagnostic?: boolean;
}

// XP por dificultad (Semana 5-8, sección 5).
export const XP: Record<Difficulty, number> = BASE_XP;

export type EmailBlock = string | { link: string; href: string };

export interface Email {
  fromName: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: EmailBlock[];
  attachments?: { name: string; size: string }[];
}

export function phishing(
  meta: Pick<SeedChallenge, "title" | "category" | "difficultyLevel" | "orderIndex" | "explanationGuide">,
  email: Email,
  solution: { indicators: string[]; isLegitimate?: boolean },
): SeedChallenge {
  return {
    ...meta,
    track: "AWARENESS",
    baseXp: XP[meta.difficultyLevel],
    payloadConfig: { type: "phishing", email: { attachments: [], ...email } },
    solution: { isLegitimate: false, ...solution },
  };
}
