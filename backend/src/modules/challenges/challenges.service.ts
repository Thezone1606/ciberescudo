import type { Challenge, Track } from "@prisma/client";
import { prisma } from "../../db";

// Nunca se expone `solution` ni `explanationGuide` hasta que el reto se intenta.
export function toPublicChallenge(c: Challenge & { category?: { name: string } }, solved?: boolean) {
  return {
    id: c.id,
    title: c.title,
    track: c.track,
    difficulty: c.difficultyLevel,
    baseXp: c.baseXp,
    orderIndex: c.orderIndex,
    category: c.category?.name,
    payload: c.payloadConfig,
    ...(solved === undefined ? {} : { solved }),
  };
}

// `solved` indica si el usuario que consulta ya acertó el reto alguna vez (para el mapa de nodos).
export async function listChallenges(userId: string, track?: Track) {
  const rows = await prisma.challenge.findMany({
    where: { isActive: true, isDiagnostic: false, ...(track ? { track } : {}) },
    include: { category: true },
    orderBy: [{ track: "asc" }, { orderIndex: "asc" }],
  });
  const wins = await prisma.attempt.findMany({
    where: { userId, isSuccessful: true, phase: "PRACTICE", challengeId: { in: rows.map((r) => r.id) } },
    select: { challengeId: true },
    distinct: ["challengeId"],
  });
  const solved = new Set(wins.map((w) => w.challengeId));
  return rows.map((r) => toPublicChallenge(r, solved.has(r.id)));
}

export async function getChallenge(id: string) {
  const row = await prisma.challenge.findFirst({
    where: { id, isActive: true, isDiagnostic: false },
    include: { category: true },
  });
  return row ? toPublicChallenge(row) : null;
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}
