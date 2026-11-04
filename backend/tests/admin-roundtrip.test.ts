import { describe, expect, it } from "vitest";
import { evaluate } from "../src/modules/attempts/evaluators";
import { toContentInput, toStorage } from "../src/modules/admin/challenge-convert";
import { challengeInput } from "../src/modules/admin/challenge-input";
import { mvpChallenges } from "../prisma/seed-data";

type Payload = Record<string, any>;

// Respuesta correcta a partir de la solución guardada (misma lógica que mvp-content.test.ts).
function correct(type: string, s: Payload) {
  if (type === "phishing") return s.isLegitimate ? { action: "mark_safe" } : { identified_indicators: s.indicators, action: "report_incident" };
  if (type === "quick") return { choice: s.correct };
  if (type === "custody") return { order: s.order };
  return { verdict: s.verdict };
}

describe("ida y vuelta de los 20 retos por el editor del administrador", () => {
  for (const c of mvpChallenges) {
    it(c.title, () => {
      // 1. lo guardado se puede abrir en el formulario
      const content = toContentInput(c.payloadConfig, c.solution);
      const input = challengeInput.parse({
        title: c.title,
        categoryId: "00000000-0000-4000-8000-000000000001",
        track: c.track,
        difficultyLevel: c.difficultyLevel,
        explanationGuide: c.explanationGuide,
        content,
      });
      // 2. al guardarlo de nuevo sigue siendo resoluble con su propia solución
      const { payloadConfig, solution } = toStorage(input.content);
      expect(evaluate(payloadConfig, solution, correct(content.type, solution))).toBe(true);
      // 3. y mantiene el mismo tipo y la misma solución
      expect(payloadConfig.type).toBe(c.payloadConfig.type);
      expect(solution).toEqual(c.solution);
    });
  }
});
