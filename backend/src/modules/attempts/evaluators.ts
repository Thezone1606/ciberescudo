import { z } from "zod";
import { HttpError } from "../../middleware/errors";

// Cada tipo de reto define qué manda el cliente y qué guarda el servidor como solución.
// El tipo sale de `payload_config.type`; la solución nunca sale del servidor.

const strList = z.array(z.string().max(100)).max(30);

const phishing = {
  response: z.object({
    identified_indicators: strList.default([]),
    action: z.enum(["report_incident", "mark_safe"]).optional(),
  }),
  // Correo legítimo: no hay indicadores y la acción correcta es marcarlo como seguro.
  solution: z.object({ indicators: strList, isLegitimate: z.boolean().default(false) }),
};

const quick = {
  response: z.object({ choice: z.string().max(100) }),
  solution: z.object({ correct: z.string() }),
};

const custody = {
  response: z.object({ order: strList }),
  solution: z.object({ order: strList }),
};

const terminal = {
  response: z.object({ verdict: z.enum(["CONFIRMED", "FALSE_POSITIVE"]) }),
  solution: z.object({ verdict: z.enum(["CONFIRMED", "FALSE_POSITIVE"]) }),
};

const sameSet = (a: string[], b: string[]) => {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
};

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function parseSolution<T extends z.ZodType>(schema: T, solution: unknown): z.infer<T> {
  const parsed = schema.safeParse(solution);
  if (!parsed.success) {
    throw new HttpError(500, "El reto tiene una solución mal configurada", "challenge_misconfigured");
  }
  return parsed.data;
}

/**
 * Devuelve true si la respuesta es correcta. Una respuesta con forma inválida lanza ZodError (400).
 * Un reto con tipo desconocido o solución mal formada es un error de configuración (500).
 */
export function evaluate(payload: unknown, solution: unknown, response: unknown): boolean {
  const type = (payload as { type?: unknown } | null)?.type;
  switch (type) {
    case "phishing": {
      const r = phishing.response.parse(response);
      const s = parseSolution(phishing.solution, solution);
      if (s.isLegitimate) return r.action === "mark_safe" && r.identified_indicators.length === 0;
      return r.action !== "mark_safe" && sameSet(r.identified_indicators, s.indicators);
    }
    case "quick": {
      const r = quick.response.parse(response);
      return r.choice === parseSolution(quick.solution, solution).correct;
    }
    case "custody": {
      const r = custody.response.parse(response);
      return sameOrder(r.order, parseSolution(custody.solution, solution).order);
    }
    case "terminal": {
      const r = terminal.response.parse(response);
      return r.verdict === parseSolution(terminal.solution, solution).verdict;
    }
    default:
      throw new HttpError(500, "Tipo de reto desconocido", "challenge_misconfigured");
  }
}
