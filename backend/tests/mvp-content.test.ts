import { describe, expect, it } from "vitest";
import { evaluate } from "../src/modules/attempts/evaluators";
import { mvpChallenges } from "../prisma/seed-data";
import { XP, type Email } from "../prisma/seed-data/types";

type Payload = Record<string, any>;
const byType = (t: string) => mvpChallenges.filter((c) => (c.payloadConfig as Payload).type === t);

// Respuesta correcta construida a partir de la solución guardada.
function correctResponse(c: (typeof mvpChallenges)[number]): unknown {
  const s = c.solution as Payload;
  switch ((c.payloadConfig as Payload).type) {
    case "phishing":
      return s.isLegitimate ? { action: "mark_safe" } : { identified_indicators: s.indicators, action: "report_incident" };
    case "quick":
      return { choice: s.correct };
    case "custody":
      return { order: s.order };
    case "terminal":
      return { verdict: s.verdict };
  }
}

describe("los 20 retos del MVP", () => {
  it("son 20 con la distribución de Notion", () => {
    expect(mvpChallenges).toHaveLength(20);
    expect(byType("phishing")).toHaveLength(10);
    expect(byType("quick")).toHaveLength(5);
    expect(byType("custody")).toHaveLength(2);
    expect(byType("terminal")).toHaveLength(3);
    expect(mvpChallenges.filter((c) => c.track === "AWARENESS")).toHaveLength(15);
    expect(mvpChallenges.filter((c) => c.track === "TECHNICAL")).toHaveLength(5);
  });

  it("títulos únicos y orden 1..n sin huecos en cada ruta", () => {
    expect(new Set(mvpChallenges.map((c) => c.title)).size).toBe(20);
    for (const track of ["AWARENESS", "TECHNICAL"] as const) {
      const order = mvpChallenges.filter((c) => c.track === track).map((c) => c.orderIndex).sort((a, b) => a - b);
      expect(order).toEqual(order.map((_, i) => i + 1));
    }
  });

  it("el XP base sigue la dificultad (10, 25, 50)", () => {
    for (const c of mvpChallenges) expect(c.baseXp).toBe(XP[c.difficultyLevel]);
  });

  it("la dificultad no baja dentro de cada ruta", () => {
    const rank = { BASIC: 0, INTERMEDIATE: 1, ADVANCED: 2 };
    for (const track of ["AWARENESS", "TECHNICAL"] as const) {
      const levels = mvpChallenges.filter((c) => c.track === track).sort((a, b) => a.orderIndex - b.orderIndex).map((c) => rank[c.difficultyLevel]);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
    }
  });

  it("cada reto se resuelve con su propia solución", () => {
    for (const c of mvpChallenges) {
      expect(evaluate(c.payloadConfig, c.solution, correctResponse(c)), c.title).toBe(true);
    }
  });

  it("todos tienen explicación y categoría válida", () => {
    const cats = ["Typosquatting", "Enlaces ocultos", "Adjuntos peligrosos", "Ingeniería social", "Manipulación de credenciales", "Preservación forense"];
    for (const c of mvpChallenges) {
      expect(c.explanationGuide.length, c.title).toBeGreaterThan(40);
      expect(cats, c.title).toContain(c.category);
    }
  });
});

describe("coherencia del contenido", () => {
  it("phishing: los indicadores corresponden a elementos que el correo realmente tiene", () => {
    for (const c of byType("phishing")) {
      const email = (c.payloadConfig as Payload).email as Email;
      const ind = (c.solution as Payload).indicators as string[];
      const hasLink = email.body.some((b) => typeof b !== "string");
      const hasAttachment = (email.attachments ?? []).length > 0;
      expect(ind.every((i) => ["sender_spoofing", "hidden_url", "dangerous_attachment", "urgency_pretext"].includes(i)), c.title).toBe(true);
      if (ind.includes("hidden_url")) expect(hasLink, c.title).toBe(true);
      if (ind.includes("dangerous_attachment")) expect(hasAttachment, c.title).toBe(true);
    }
  });

  it("phishing: un enlace malicioso muestra un destino distinto al texto o a un dominio externo", () => {
    for (const c of byType("phishing")) {
      const email = (c.payloadConfig as Payload).email as Email;
      const links = email.body.filter((b): b is { link: string; href: string } => typeof b !== "string");
      if ((c.solution as Payload).indicators.includes("hidden_url")) {
        expect(links.some((l) => !new URL(l.href).hostname.endsWith("dsintelligence.com")), c.title).toBe(true);
      } else {
        for (const l of links) expect(new URL(l.href).hostname.endsWith("dsintelligence.com"), c.title).toBe(true);
      }
    }
  });

  it("phishing: hay un correo legítimo y los demás tienen al menos un indicador", () => {
    const legit = byType("phishing").filter((c) => (c.solution as Payload).isLegitimate);
    expect(legit).toHaveLength(1);
    for (const c of byType("phishing")) {
      if (!(c.solution as Payload).isLegitimate) expect((c.solution as Payload).indicators.length, c.title).toBeGreaterThan(0);
    }
  });

  it("decisión rápida: la respuesta correcta es una de las opciones y no siempre la misma", () => {
    for (const c of byType("quick")) {
      const ids = ((c.payloadConfig as Payload).options as { id: string }[]).map((o) => o.id);
      expect(ids).toContain((c.solution as Payload).correct);
    }
    expect(new Set(byType("quick").map((c) => (c.solution as Payload).correct)).size).toBeGreaterThan(1);
  });

  it("custodia: los elementos son una permutación de la solución y no vienen ya ordenados", () => {
    for (const c of byType("custody")) {
      const items = (c.payloadConfig as Payload).items as string[];
      const order = (c.solution as Payload).order as string[];
      expect([...items].sort()).toEqual([...order].sort());
      expect(items, c.title).not.toEqual(order);
    }
  });

  it("terminal: el escenario no regala el veredicto y los hashes son SHA-256 válidos", () => {
    for (const c of byType("terminal")) {
      const p = c.payloadConfig as Payload;
      expect(JSON.stringify(p), c.title).not.toMatch(/CONFIRMED|FALSE_POSITIVE/);
      for (const f of p.files as { sha256?: string }[]) if (f.sha256) expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("terminal: el reto de hash incluye el indicador y coincide con el archivo marcado", () => {
    const c = byType("terminal").find((x) => (x.payloadConfig as Payload).files.some((f: Payload) => f.name === "updater_helper.exe"))!;
    const p = c.payloadConfig as Payload;
    const target = p.files.find((f: Payload) => f.name === "updater_helper.exe");
    expect(p.scenario).toContain(target.sha256);
  });

  it("ninguna solución aparece en el payload que se envía al cliente", () => {
    for (const c of mvpChallenges) {
      const payload = JSON.stringify(c.payloadConfig);
      const s = c.solution as Payload;
      if (s.indicators?.length) for (const i of s.indicators) expect(payload).not.toContain(i);
      if (s.order) expect(payload).not.toContain(JSON.stringify(s.order));
    }
  });
});
