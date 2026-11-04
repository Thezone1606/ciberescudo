import type { Difficulty, Prisma, Track } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "../../db";
import { HttpError } from "../../middleware/errors";
import { BASE_XP } from "../gamification/rules";
import type { ChallengeInput } from "./challenge-input";
import { toContentInput, toStorage } from "./challenge-convert";

type Json = Record<string, unknown>;

const fail = (path: (string | number)[], message: string) => new ZodError([{ code: "custom", path, message, input: undefined }]);

export async function listAdminChallenges(filter: { track?: Track; active?: boolean }) {
  const rows = await prisma.challenge.findMany({
    where: { ...(filter.track ? { track: filter.track } : {}), ...(filter.active === undefined ? {} : { isActive: filter.active }) },
    include: { category: true },
    orderBy: [{ isDiagnostic: "asc" }, { track: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
  });
  const stats = await prisma.attempt.groupBy({ by: ["challengeId", "isSuccessful"], _count: { _all: true } });
  const byChallenge = new Map<string, { total: number; failed: number }>();
  for (const s of stats) {
    const cur = byChallenge.get(s.challengeId) ?? { total: 0, failed: 0 };
    cur.total += s._count._all;
    if (!s.isSuccessful) cur.failed += s._count._all;
    byChallenge.set(s.challengeId, cur);
  }
  return rows.map((c) => {
    const st = byChallenge.get(c.id);
    return {
      id: c.id,
      title: c.title,
      track: c.track,
      type: (c.payloadConfig as Json).type as string,
      category: c.category.name,
      categoryId: c.categoryId,
      difficulty: c.difficultyLevel,
      baseXp: c.baseXp,
      orderIndex: c.orderIndex,
      isActive: c.isActive,
      isDiagnostic: c.isDiagnostic,
      attempts: st?.total ?? 0,
      failureRate: st && st.total ? Math.round((st.failed / st.total) * 1000) / 10 : null,
    };
  });
}

export async function getAdminChallenge(id: string) {
  const c = await prisma.challenge.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
  if (!c) throw new HttpError(404, "Reto no encontrado", "not_found");
  return {
    id: c.id,
    title: c.title,
    categoryId: c.categoryId,
    track: c.track,
    difficultyLevel: c.difficultyLevel,
    baseXp: c.baseXp,
    orderIndex: c.orderIndex,
    explanationGuide: c.explanationGuide,
    isActive: c.isActive,
    isDiagnostic: c.isDiagnostic,
    attempts: c._count.attempts,
    content: toContentInput(c.payloadConfig as Json, c.solution as Json),
  };
}

async function validateRefs(input: ChallengeInput, selfId?: string) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw fail(["categoryId"], "La categoría no existe");
  const dup = await prisma.challenge.findFirst({
    where: { title: { equals: input.title, mode: "insensitive" }, ...(selfId ? { NOT: { id: selfId } } : {}) },
    select: { id: true },
  });
  if (dup) throw fail(["title"], "Ya existe un reto con ese título");
}

function data(input: ChallengeInput, orderIndex: number): Prisma.ChallengeUncheckedCreateInput {
  const { payloadConfig, solution } = toStorage(input.content);
  return {
    title: input.title,
    categoryId: input.categoryId,
    track: input.track,
    difficultyLevel: input.difficultyLevel,
    baseXp: input.baseXp ?? BASE_XP[input.difficultyLevel as Difficulty],
    orderIndex,
    isActive: input.isActive,
    isDiagnostic: input.isDiagnostic,
    explanationGuide: input.explanationGuide,
    payloadConfig: payloadConfig as Prisma.InputJsonValue,
    solution: solution as Prisma.InputJsonValue,
  };
}

export async function createChallenge(input: ChallengeInput) {
  await validateRefs(input);
  const last = await prisma.challenge.aggregate({ where: { track: input.track, isDiagnostic: input.isDiagnostic }, _max: { orderIndex: true } });
  const created = await prisma.challenge.create({ data: data(input, input.orderIndex ?? (last._max.orderIndex ?? 0) + 1) });
  return getAdminChallenge(created.id);
}

export async function updateChallenge(id: string, input: ChallengeInput) {
  const current = await prisma.challenge.findUnique({ where: { id }, select: { orderIndex: true, track: true, isDiagnostic: true } });
  if (!current) throw new HttpError(404, "Reto no encontrado", "not_found");
  await validateRefs(input, id);
  // Pasar un reto entre práctica y diagnóstico con intentos registrados mezclaría las dos mediciones.
  if (current.isDiagnostic !== input.isDiagnostic && (await prisma.attempt.count({ where: { challengeId: id } })) > 0) {
    throw fail(["isDiagnostic"], "No se puede cambiar entre práctica y diagnóstico un reto que ya tiene intentos");
  }
  await prisma.challenge.update({ where: { id }, data: data(input, input.orderIndex ?? current.orderIndex) });
  return getAdminChallenge(id);
}

export async function setChallengeActive(id: string, isActive: boolean) {
  const found = await prisma.challenge.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(404, "Reto no encontrado", "not_found");
  await prisma.challenge.update({ where: { id }, data: { isActive } });
  return getAdminChallenge(id);
}
