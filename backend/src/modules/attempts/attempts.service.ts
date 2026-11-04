import type { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { HttpError } from "../../middleware/errors";
import { applyAttempt, calendarDay, isInCooldown, recoverShield, type GameState } from "../gamification/rules";
import { baselinePending } from "../pilot/pilot.service";
import { evaluate } from "./evaluators";

export interface AttemptInput {
  timeTakenSeconds: number;
  response: Record<string, unknown>;
}

export async function submitAttempt(userId: string, challengeId: string, input: AttemptInput, now = new Date()) {
  const challenge = await prisma.challenge.findFirst({ where: { id: challengeId, isActive: true, isDiagnostic: false } });
  if (!challenge) throw new HttpError(404, "Reto no encontrado", "not_found");
  // Durante el diagnóstico inicial del piloto no se practica hasta terminarlo.
  if (await baselinePending(userId)) throw new HttpError(403, "Completa primero el diagnóstico inicial", "diagnostic_pending");

  // Se evalúa antes de abrir la transacción: una respuesta mal formada (400) no toca el estado.
  const successful = evaluate(challenge.payloadConfig, challenge.solution, input.response);

  return prisma.$transaction(async (tx) => {
    // Bloquea la fila del usuario: dos intentos simultáneos se procesan uno tras otro.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    const before: GameState = recoverShield(
      {
        xp: user.currentXp,
        streak: user.currentStreak,
        shield: user.shieldIntegrity,
        cooldownUntil: user.cooldownUntil,
        lastActivityDay: user.lastActivityDate ? user.lastActivityDate.toISOString().slice(0, 10) : null,
      },
      now,
    );

    if (isInCooldown(before.cooldownUntil, now)) {
      const retryAfter = Math.ceil((before.cooldownUntil!.getTime() - now.getTime()) / 1000);
      throw new HttpError(423, "Escudo agotado: repasa la explicación y espera para reintentar", "cooldown", {
        cooldown_until: before.cooldownUntil,
        retry_after_seconds: retryAfter,
      });
    }

    const firstSuccess =
      successful &&
      (await tx.attempt.count({ where: { userId, challengeId, isSuccessful: true, phase: "PRACTICE" } })) === 0;

    const { state, xpAwarded } = applyAttempt(
      before,
      { successful, baseXp: challenge.baseXp, firstSuccess },
      now,
    );

    const data: Prisma.UserUpdateInput = {
      currentXp: state.xp,
      currentStreak: state.streak,
      shieldIntegrity: state.shield,
      cooldownUntil: state.cooldownUntil,
    };
    if (successful) data.lastActivityDate = new Date(`${calendarDay(now)}T00:00:00.000Z`);
    await tx.user.update({ where: { id: userId }, data });

    await tx.attempt.create({
      data: {
        userId,
        challengeId,
        isSuccessful: successful,
        responsePayload: input.response as Prisma.InputJsonValue,
        timeTakenSeconds: input.timeTakenSeconds,
      },
    });

    return {
      is_successful: successful,
      xp_awarded: xpAwarded,
      current_xp: state.xp,
      current_streak: state.streak,
      shield_integrity: state.shield,
      cooldown_until: state.cooldownUntil,
      feedback: successful
        ? firstSuccess
          ? "Buen análisis."
          : "Este reto ya lo habías resuelto, así que no suma XP nuevo."
        : "Tu respuesta no coincide. Revisa la explicación e inténtalo de nuevo.",
      explanation_guide: challenge.explanationGuide,
    };
  });
}
