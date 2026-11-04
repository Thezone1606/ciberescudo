import { createHash, randomInt } from "node:crypto";
import type { ContentInput } from "./challenge-input";

type Json = Record<string, unknown>;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Baraja (Fisher-Yates) y garantiza que el resultado no quede ya en el orden correcto. */
export function shuffled<T>(items: T[]): T[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 20; attempt++) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.some((x, i) => x !== items[i])) return out;
  }
  return [...items.slice(1), items[0]]; // rotación: siempre distinta si hay elementos únicos
}

/** Forma «legible» del formulario → payload (lo que ve el jugador) y solución (lo que solo ve el servidor). */
export function toStorage(c: ContentInput): { payloadConfig: Json; solution: Json } {
  switch (c.type) {
    case "phishing":
      return {
        payloadConfig: { type: "phishing", email: c.email },
        solution: { indicators: c.indicators, isLegitimate: c.isLegitimate },
      };
    case "quick": {
      const ids = c.options.map((_, i) => String.fromCharCode(97 + i));
      return {
        payloadConfig: { type: "quick", scenario: c.scenario, question: c.question, options: c.options.map((text, i) => ({ id: ids[i], text })) },
        solution: { correct: ids[c.correctIndex] },
      };
    }
    case "custody":
      return {
        payloadConfig: { type: "custody", scenario: c.scenario, items: shuffled(c.order) },
        solution: { order: c.order },
      };
    case "terminal":
      return {
        payloadConfig: {
          type: "terminal",
          host: c.host,
          cwd: c.cwd,
          scenario: c.scenario,
          objective: c.objective,
          // Los archivos de texto reciben su SHA-256 para que `sha256sum` funcione con ellos.
          files: c.files.map((f) => ({
            name: f.name,
            ...(f.binary ? { binary: true, sha256: f.sha256 } : { content: f.content, sha256: f.sha256 ?? sha256(f.content ?? "") }),
            ...(f.size ? { size: f.size } : {}),
          })),
          whois: c.whois,
        },
        solution: { verdict: c.verdict },
      };
  }
}

/** Lo guardado → forma del formulario, para editar un reto existente. */
export function toContentInput(payload: Json, solution: Json): ContentInput {
  const p = payload as Record<string, any>;
  const s = solution as Record<string, any>;
  switch (p.type) {
    case "phishing":
      return { type: "phishing", email: { attachments: [], ...p.email }, indicators: s.indicators ?? [], isLegitimate: !!s.isLegitimate };
    case "quick": {
      const options = (p.options as { id: string; text: string }[]).map((o) => o.text);
      const correctIndex = (p.options as { id: string }[]).findIndex((o) => o.id === s.correct);
      return { type: "quick", scenario: p.scenario, question: p.question, options, correctIndex: Math.max(0, correctIndex) };
    }
    case "custody":
      return { type: "custody", scenario: p.scenario, order: s.order };
    case "terminal":
      return {
        type: "terminal",
        host: p.host,
        cwd: p.cwd,
        scenario: p.scenario,
        objective: p.objective,
        files: (p.files as Record<string, any>[]).map((f) => ({
          name: f.name,
          binary: !!f.binary,
          // Para texto, el hash se recalcula al guardar; no se muestra como dato editable.
          ...(f.binary ? { sha256: f.sha256 } : { content: f.content }),
          ...(f.size ? { size: f.size } : {}),
        })),
        whois: p.whois ?? {},
        verdict: s.verdict,
      };
    default:
      throw new Error(`Tipo de reto desconocido: ${String(p.type)}`);
  }
}
