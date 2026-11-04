import { describe, expect, it } from "vitest";
import { deltaPct, longestRun, mean, median, ratePct } from "../src/modules/pilot/pilot.stats";
import { SUS_QUESTIONS, susGrade, susScore } from "../src/modules/pilot/sus";

describe("SUS", () => {
  it("tiene 10 afirmaciones, alternando positivas y negativas", () => {
    expect(SUS_QUESTIONS).toHaveLength(10);
  });

  it("puntuación: mejor 100, peor 0, neutra 50", () => {
    expect(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
    expect(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50);
  });

  it("ejemplo de la literatura: 4,2,4,1,5,2,4,2,5,1 → 85", () => {
    // impares (r-1): 3+3+4+3+4 = 17; pares (5-r): 3+4+3+3+4 = 17; (17+17)*2.5 = 85
    expect(susScore([4, 2, 4, 1, 5, 2, 4, 2, 5, 1])).toBe(85);
  });

  it("rechaza respuestas fuera de rango, no enteras o en cantidad distinta de 10", () => {
    expect(() => susScore([3, 3, 3])).toThrow();
    expect(() => susScore([0, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toThrow();
    expect(() => susScore([6, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toThrow();
    expect(() => susScore([3.5, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toThrow();
  });

  it("etiquetas por puntuación", () => {
    expect([90, 75, 60, 40].map(susGrade)).toEqual(["Excelente", "Buena", "Aceptable", "Deficiente"]);
  });
});

describe("estadísticas del reporte", () => {
  it("variación porcentual con la fórmula de Notion", () => {
    expect(deltaPct(50, 75)).toBe(50);
    expect(deltaPct(80, 60)).toBe(-25);
    expect(deltaPct(66.7, 100)).toBe(49.9);
  });

  it("sin base de comparación no hay variación (no se divide entre cero)", () => {
    expect(deltaPct(0, 50)).toBeNull();
    expect(deltaPct(null, 50)).toBeNull();
    expect(deltaPct(50, null)).toBeNull();
  });

  it("racha más larga: consecutivos, huecos, repetidos y cambio de mes o año", () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun(["2026-11-01"])).toBe(1);
    expect(longestRun(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"])).toBe(4);
    expect(longestRun(["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06"])).toBe(3);
    expect(longestRun(["2026-11-02", "2026-11-02", "2026-11-02"])).toBe(1);
    expect(longestRun(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"])).toBe(4);
    expect(longestRun(["2026-11-04", "2026-11-01", "2026-11-03", "2026-11-02"])).toBe(4); // desordenados
  });

  it("promedio, mediana y porcentaje con listas vacías", () => {
    expect(mean([])).toBeNull();
    expect(mean([10, 20, 25])).toBe(18.3);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(ratePct(0, 0)).toBeNull();
    expect(ratePct(1, 3)).toBe(33.3);
  });
});
