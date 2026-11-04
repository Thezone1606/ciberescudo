import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { HttpError } from "../src/middleware/errors";
import { evaluate } from "../src/modules/attempts/evaluators";

const phishing = { type: "phishing" };
const sol = { indicators: ["sender_typosquatting", "hidden_url"] };

describe("phishing", () => {
  it("acierta con los indicadores exactos, sin importar el orden ni duplicados", () => {
    expect(evaluate(phishing, sol, { identified_indicators: ["hidden_url", "sender_typosquatting", "hidden_url"], action: "report_incident" })).toBe(true);
  });
  it("falla si falta un indicador o sobra uno", () => {
    expect(evaluate(phishing, sol, { identified_indicators: ["hidden_url"] })).toBe(false);
    expect(evaluate(phishing, sol, { identified_indicators: ["hidden_url", "sender_typosquatting", "extra"] })).toBe(false);
  });
  it("falla si marca como seguro un correo malicioso", () => {
    expect(evaluate(phishing, sol, { identified_indicators: sol.indicators, action: "mark_safe" })).toBe(false);
  });
  it("correo legítimo: solo acierta quien lo marca seguro y no señala nada", () => {
    const legit = { indicators: [], isLegitimate: true };
    expect(evaluate(phishing, legit, { action: "mark_safe" })).toBe(true);
    expect(evaluate(phishing, legit, { identified_indicators: ["hidden_url"], action: "mark_safe" })).toBe(false);
    expect(evaluate(phishing, legit, { identified_indicators: [] })).toBe(false);
  });
});

describe("otros tipos", () => {
  it("decisión rápida", () => {
    expect(evaluate({ type: "quick" }, { correct: "b" }, { choice: "b" })).toBe(true);
    expect(evaluate({ type: "quick" }, { correct: "b" }, { choice: "a" })).toBe(false);
  });
  it("cadena de custodia exige el orden exacto", () => {
    const order = ["RAM", "Red", "Procesos", "Disco"];
    expect(evaluate({ type: "custody" }, { order }, { order: [...order] })).toBe(true);
    expect(evaluate({ type: "custody" }, { order }, { order: ["Red", "RAM", "Procesos", "Disco"] })).toBe(false);
    expect(evaluate({ type: "custody" }, { order }, { order: order.slice(0, 3) })).toBe(false);
  });
  it("terminal: veredicto", () => {
    expect(evaluate({ type: "terminal" }, { verdict: "CONFIRMED" }, { verdict: "CONFIRMED" })).toBe(true);
    expect(evaluate({ type: "terminal" }, { verdict: "CONFIRMED" }, { verdict: "FALSE_POSITIVE" })).toBe(false);
  });
});

describe("entradas inválidas", () => {
  it("una respuesta mal formada lanza ZodError (400), no devuelve false", () => {
    expect(() => evaluate({ type: "quick" }, { correct: "b" }, {})).toThrow(ZodError);
    expect(() => evaluate({ type: "terminal" }, { verdict: "CONFIRMED" }, { verdict: "TAL VEZ" })).toThrow(ZodError);
    expect(() => evaluate({ type: "custody" }, { order: [] }, { order: "RAM" })).toThrow(ZodError);
  });
  it("tipo desconocido o solución rota es un error de configuración (500)", () => {
    expect(() => evaluate({ type: "ruleta" }, {}, {})).toThrow(HttpError);
    expect(() => evaluate({}, {}, {})).toThrow(HttpError);
    expect(() => evaluate({ type: "quick" }, { mal: 1 }, { choice: "a" })).toThrow(HttpError);
  });
});
