// System Usability Scale (Brooke, 1996), versión en español. 10 afirmaciones en escala 1 (total
// desacuerdo) a 5 (total acuerdo). Las impares son positivas y las pares, negativas.
export const SUS_QUESTIONS = [
  "Creo que me gustaría usar este sistema con frecuencia.",
  "Encontré el sistema innecesariamente complejo.",
  "Pensé que el sistema era fácil de usar.",
  "Creo que necesitaría el apoyo de un técnico para poder usar este sistema.",
  "Encontré que las diversas funciones del sistema estaban bien integradas.",
  "Pensé que había demasiada inconsistencia en este sistema.",
  "Imagino que la mayoría de las personas aprenderían a usar este sistema muy rápidamente.",
  "Encontré el sistema muy complicado de usar.",
  "Me sentí muy seguro/a usando el sistema.",
  "Necesité aprender muchas cosas antes de poder empezar a usar este sistema.",
] as const;

export const SUS_GOAL = 80; // meta del proyecto: media superior a 80 («Excelente», grado A)

/** Puntuación 0-100: impares aportan (respuesta − 1), pares (5 − respuesta); la suma se multiplica por 2.5. */
export function susScore(answers: number[]): number {
  if (answers.length !== 10 || answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) {
    throw new Error("El SUS requiere 10 respuestas enteras de 1 a 5");
  }
  const sum = answers.reduce((s, a, i) => s + (i % 2 === 0 ? a - 1 : 5 - a), 0);
  return sum * 2.5;
}

/** Etiqueta cualitativa habitual para una puntuación SUS (Bangor et al.). */
export function susGrade(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 72) return "Buena";
  if (score >= 52) return "Aceptable";
  return "Deficiente";
}
