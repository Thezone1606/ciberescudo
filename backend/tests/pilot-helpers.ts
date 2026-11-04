import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/db";

export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

export const setPhase = (value: string) =>
  prisma.setting.upsert({ where: { key: "pilot_phase" }, update: { value }, create: { key: "pilot_phase", value } });

/** Guarda la fase actual y devuelve cómo restaurarla (las pruebas del piloto la cambian). */
export async function rememberPhase() {
  const previous = (await prisma.setting.findUnique({ where: { key: "pilot_phase" } }))?.value;
  return async () => {
    if (previous) await setPhase(previous);
    else await prisma.setting.deleteMany({ where: { key: "pilot_phase" } });
  };
}

/** Respuesta correcta de un reto de diagnóstico, construida con su solución guardada. */
export async function correctFor(challengeId: string) {
  const c = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId } });
  const s = c.solution as { indicators: string[]; isLegitimate: boolean };
  return s.isLegitimate ? { action: "mark_safe" } : { identified_indicators: s.indicators, action: "report_incident" };
}

export const answer = (app: Express, token: string, id: string, response: unknown, time = 12) =>
  request(app).post(`/api/v1/pilot/diagnostic/${id}`).set(bearer(token)).send({ time_taken_seconds: time, response });
