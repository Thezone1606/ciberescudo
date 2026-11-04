import type { AttemptPhase, Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { HttpError } from "../../middleware/errors";
import { evaluate } from "../attempts/evaluators";
import { SUS_QUESTIONS, susScore } from "./sus";

export const PHASES = ["OFF", "BASELINE", "PRACTICE", "POSTTEST", "CLOSED"] as const;
export type Phase = (typeof PHASES)[number];

const KEY = "pilot_phase";

export async function getPhase(): Promise<Phase> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return PHASES.includes(row?.value as Phase) ? (row!.value as Phase) : "OFF";
}

/** El diagnóstico solo está abierto en BASELINE (inicial) y POSTTEST (final). */
export const diagnosticPhase = (p: Phase): Extract<AttemptPhase, "BASELINE" | "POSTTEST"> | null =>
  p === "BASELINE" ? "BASELINE" : p === "POSTTEST" ? "POSTTEST" : null;

export const activeDiagnostics = () =>
  prisma.challenge.findMany({ where: { isDiagnostic: true, isActive: true }, orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] });

export async function setPhase(phase: Phase) {
  if (diagnosticPhase(phase) && (await activeDiagnostics()).length === 0) {
    throw new HttpError(409, "No hay retos de diagnóstico activos: carga o activa al menos uno antes de abrir esta fase", "no_diagnostic");
  }
  await prisma.setting.upsert({ where: { key: KEY }, update: { value: phase }, create: { key: KEY, value: phase } });
  return phase;
}

async function answeredIds(userId: string, phase: AttemptPhase) {
  const rows = await prisma.attempt.findMany({ where: { userId, phase }, select: { challengeId: true } });
  return new Set(rows.map((r) => r.challengeId));
}

export async function diagnosticProgress(userId: string) {
  const phase = await getPhase();
  const dp = diagnosticPhase(phase);
  const items = await activeDiagnostics();
  const done = dp ? await answeredIds(userId, dp) : new Set<string>();
  const answered = items.filter((i) => done.has(i.id)).length;
  return { phase, dp, items, done, total: items.length, answered, completed: !!dp && items.length > 0 && answered >= items.length };
}

/** Mientras se aplica el diagnóstico inicial, no se puede practicar hasta terminarlo. */
export async function baselinePending(userId: string): Promise<boolean> {
  const p = await diagnosticProgress(userId);
  return p.phase === "BASELINE" && p.total > 0 && !p.completed;
}

export async function pilotStatus(userId: string) {
  const p = await diagnosticProgress(userId);
  const sus = await prisma.susResponse.findUnique({ where: { userId }, select: { id: true } });
  return {
    phase: p.phase,
    diagnostic: { active: !!p.dp, total: p.total, answered: p.answered, pending: p.dp ? p.total - p.answered : 0, completed: p.completed },
    baselineRequired: p.phase === "BASELINE" && p.total > 0 && !p.completed,
    sus: { available: p.phase === "POSTTEST" || p.phase === "CLOSED", done: !!sus },
  };
}

/** Siguiente reto del diagnóstico sin contestar (solo el payload: nunca la solución). */
export async function nextDiagnostic(userId: string) {
  const p = await diagnosticProgress(userId);
  if (!p.dp) throw new HttpError(409, "El diagnóstico no está abierto", "diagnostic_closed");
  const next = p.items.find((i) => !p.done.has(i.id));
  return {
    phase: p.phase,
    total: p.total,
    answered: p.answered,
    item: next ? { id: next.id, title: next.title, index: p.answered + 1, payload: next.payloadConfig } : null,
  };
}

/** Registra una respuesta de diagnóstico. No da retroalimentación ni toca XP, escudo o racha. */
export async function submitDiagnostic(userId: string, challengeId: string, input: { timeTakenSeconds: number; response: Record<string, unknown> }) {
  const p = await diagnosticProgress(userId);
  if (!p.dp) throw new HttpError(409, "El diagnóstico no está abierto", "diagnostic_closed");
  const challenge = p.items.find((i) => i.id === challengeId);
  if (!challenge) throw new HttpError(404, "Reto de diagnóstico no encontrado", "not_found");
  if (p.done.has(challengeId)) throw new HttpError(409, "Ya respondiste este reto en esta fase", "already_answered");

  const successful = evaluate(challenge.payloadConfig, challenge.solution, input.response);
  try {
    await prisma.attempt.create({
      data: {
        userId,
        challengeId,
        phase: p.dp,
        isSuccessful: successful,
        responsePayload: input.response as Prisma.InputJsonValue,
        timeTakenSeconds: input.timeTakenSeconds,
      },
    });
  } catch (e) {
    // Carrera entre dos envíos: el índice único parcial impide el duplicado.
    if ((e as { code?: string }).code === "P2002") throw new HttpError(409, "Ya respondiste este reto en esta fase", "already_answered");
    throw e;
  }
  return { recorded: true, total: p.total, answered: p.answered + 1 };
}

export async function susStatus(userId: string) {
  const phase = await getPhase();
  const done = !!(await prisma.susResponse.findUnique({ where: { userId }, select: { id: true } }));
  return { available: phase === "POSTTEST" || phase === "CLOSED", done, questions: SUS_QUESTIONS };
}

export async function submitSus(userId: string, answers: number[]) {
  const phase = await getPhase();
  if (phase !== "POSTTEST" && phase !== "CLOSED") throw new HttpError(409, "El cuestionario todavía no está disponible", "sus_closed");
  const score = susScore(answers);
  try {
    await prisma.susResponse.create({ data: { userId, answers, score } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new HttpError(409, "Ya respondiste el cuestionario", "already_answered");
    throw e;
  }
  return { recorded: true };
}
