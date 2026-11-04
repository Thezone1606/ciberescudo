import request from "supertest";
import type { Express } from "express";

export const USERS = {
  colaborador: "colaborador@dsintelligence.test",
  analista: "analista@dsintelligence.test",
  secops: "secops@dsintelligence.test",
} as const;

export async function loginAs(app: Express, who: keyof typeof USERS) {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: USERS[who], password: process.env.SEED_PASSWORD });
  if (res.status !== 200) throw new Error(`login falló para ${who}: ${res.status}`);
  return res.body as { accessToken: string; refreshToken: string; user: { id: string; role: string } };
}

import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/db";

// Usuario desechable: evita que las pruebas que revocan sesiones afecten a los usuarios del seed.
export async function createTempUser(roleName: "COLABORADOR" | "ANALISTA" | "SECOPS") {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  const department = await prisma.department.findFirstOrThrow();
  const password = `Tmp-${randomUUID()}`;
  const email = `tmp-${randomUUID()}@dsintelligence.test`;
  const user = await prisma.user.create({
    data: {
      email,
      fullName: "Usuario Temporal",
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      roleId: role.id,
      departmentId: department.id,
    },
  });
  return { id: user.id, email, password };
}

export async function loginTemp(app: Express, u: { email: string; password: string }) {
  const res = await request(app).post("/api/v1/auth/login").send(u);
  if (res.status !== 200) throw new Error(`login temporal falló: ${res.status}`);
  return res.body as { accessToken: string; refreshToken: string };
}

export function deleteTempUser(id: string) {
  return prisma.user.delete({ where: { id } }).catch(() => undefined);
}

import type { Difficulty, Prisma, Track } from "@prisma/client";

// Reto desechable: cada prueba crea el suyo para no depender del seed.
export async function createTempChallenge(opts: {
  payloadConfig: Prisma.InputJsonValue;
  solution: Prisma.InputJsonValue;
  baseXp?: number;
  difficulty?: Difficulty;
  track?: Track;
  isActive?: boolean;
}) {
  const category = await prisma.category.findFirstOrThrow();
  return prisma.challenge.create({
    data: {
      categoryId: category.id,
      title: `TEST-${randomUUID()}`,
      track: opts.track ?? "AWARENESS",
      difficultyLevel: opts.difficulty ?? "BASIC",
      baseXp: opts.baseXp ?? 10,
      payloadConfig: opts.payloadConfig,
      solution: opts.solution,
      explanationGuide: "Explicación de prueba",
      isActive: opts.isActive ?? true,
    },
  });
}

export const QUICK_PAYLOAD = { type: "quick", question: "¿Qué haces?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] };
export const QUICK_SOLUTION = { correct: "b" };
