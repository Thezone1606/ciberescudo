import type { AttemptPhase } from "@prisma/client";
import { prisma } from "../../db";
import { calendarDay } from "../gamification/rules";
import { activeDiagnostics, getPhase } from "./pilot.service";
import { deltaPct, longestRun, mean, median, ratePct, round1 } from "./pilot.stats";
import { SUS_GOAL, susGrade } from "./sus";

const PLAYERS = { role: { name: { not: "SECOPS" } } } as const; // las cuentas de administración no son participantes
export const ADHERENCE_DAYS = 4; // Notion: «usuarios con racha ≥ 4 días consecutivos»
const MIN_PAIRED = 10; // por debajo de esto, las comparaciones son orientativas

type Row = { userId: string; phase: AttemptPhase; isSuccessful: boolean; timeTakenSeconds: number; challengeId: string };

const isLegit = (solution: unknown) => !!(solution as { isLegitimate?: boolean } | null)?.isLegitimate;

async function loadDiagnostic() {
  const items = await activeDiagnostics();
  const legit = new Set(items.filter((i) => isLegit(i.solution)).map((i) => i.id));
  const malicious = new Set(items.filter((i) => !isLegit(i.solution)).map((i) => i.id));
  const rows: Row[] = await prisma.attempt.findMany({
    where: { phase: { in: ["BASELINE", "POSTTEST"] }, challengeId: { in: items.map((i) => i.id) }, user: PLAYERS },
    select: { userId: true, phase: true, isSuccessful: true, timeTakenSeconds: true, challengeId: true },
  });
  return { total: items.length, legit, malicious, rows };
}

/** Personas que contestaron todos los retos del diagnóstico en una fase. */
function completedIn(rows: Row[], phase: AttemptPhase, total: number): Set<string> {
  const byUser = new Map<string, Set<string>>();
  for (const r of rows) if (r.phase === phase) byUser.set(r.userId, (byUser.get(r.userId) ?? new Set()).add(r.challengeId));
  return new Set([...byUser].filter(([, set]) => set.size >= total && total > 0).map(([u]) => u));
}

export async function pilotOverview() {
  const [phase, d, participants, sus] = await Promise.all([getPhase(), loadDiagnostic(), prisma.user.count({ where: PLAYERS }), prisma.susResponse.count({ where: { user: PLAYERS } })]);
  return {
    phase,
    participants,
    diagnosticItems: { total: d.total, malicious: d.malicious.size, legitimate: d.legit.size },
    baselineCompleted: completedIn(d.rows, "BASELINE", d.total).size,
    posttestCompleted: completedIn(d.rows, "POSTTEST", d.total).size,
    susResponses: sus,
  };
}

function phaseStats(rows: Row[], phase: AttemptPhase, paired: Set<string>, malicious: Set<string>, legit: Set<string>) {
  const mine = rows.filter((r) => r.phase === phase && paired.has(r.userId));
  const mal = mine.filter((r) => malicious.has(r.challengeId));
  const leg = mine.filter((r) => legit.has(r.challengeId));
  const wins = mal.filter((r) => r.isSuccessful);
  return {
    detectionRate: ratePct(wins.length, mal.length),
    falsePositiveRate: ratePct(leg.filter((r) => !r.isSuccessful).length, leg.length),
    mttdSeconds: mean(wins.map((r) => r.timeTakenSeconds)),
    attempts: mine.length,
  };
}

export async function pilotReport() {
  const [overview, d, users, wins, practice, susRows] = await Promise.all([
    pilotOverview(),
    loadDiagnostic(),
    prisma.user.findMany({ where: PLAYERS, select: { role: { select: { name: true } } } }),
    prisma.attempt.findMany({ where: { phase: "PRACTICE", isSuccessful: true, user: PLAYERS }, select: { userId: true, createdAt: true } }),
    prisma.attempt.groupBy({ by: ["isSuccessful"], where: { phase: "PRACTICE", user: PLAYERS }, _count: { _all: true } }),
    prisma.susResponse.findMany({ where: { user: PLAYERS }, select: { answers: true, score: true } }),
  ]);

  // El cambio se mide en las mismas personas: solo cuentan quienes completaron el diagnóstico inicial y el final.
  const base = completedIn(d.rows, "BASELINE", d.total);
  const post = completedIn(d.rows, "POSTTEST", d.total);
  const paired = new Set([...base].filter((u) => post.has(u)));
  const before = phaseStats(d.rows, "BASELINE", paired, d.malicious, d.legit);
  const after = phaseStats(d.rows, "POSTTEST", paired, d.malicious, d.legit);

  // Adherencia: personas con 4 o más días consecutivos (hora de México) con al menos un acierto en la práctica.
  const daysByUser = new Map<string, Set<string>>();
  for (const w of wins) daysByUser.set(w.userId, (daysByUser.get(w.userId) ?? new Set()).add(calendarDay(w.createdAt)));
  const adherent = [...daysByUser.values()].filter((days) => longestRun(days) >= ADHERENCE_DAYS).length;

  const total = users.length;
  const technical = users.filter((u) => u.role.name === "ANALISTA").length;
  const okAttempts = practice.find((p) => p.isSuccessful)?._count._all ?? 0;
  const allAttempts = practice.reduce((s, p) => s + p._count._all, 0);

  const scores = susRows.map((r) => r.score);
  const susMean = mean(scores);
  const perQuestion = Array.from({ length: 10 }, (_, i) => mean(susRows.map((r) => r.answers[i]))); // media 1-5 por afirmación

  const notes = [
    "Detección = aciertos en los correos maliciosos del diagnóstico; falsos positivos = errores en los legítimos.",
    "El diagnóstico inicial y el final usan los mismos correos; parte de la mejora puede deberse a recordarlos.",
    "El tiempo de detección es el promedio de segundos hasta resolver bien un correo malicioso del diagnóstico.",
  ];
  if (paired.size < MIN_PAIRED) notes.push(`Solo ${paired.size} personas completaron el diagnóstico inicial y el final: interpreta las variaciones con cautela.`);
  if (scores.length < MIN_PAIRED) notes.push(`El SUS tiene ${scores.length} respuestas; con menos de ${MIN_PAIRED} la media es orientativa.`);

  return {
    generatedAt: new Date().toISOString(),
    phase: overview.phase,
    participants: { total, technical, nonTechnical: total - technical, technicalSharePct: ratePct(technical, total) },
    diagnostic: { items: overview.diagnosticItems, baselineCompleted: overview.baselineCompleted, posttestCompleted: overview.posttestCompleted, paired: paired.size },
    detection: { baselinePct: before.detectionRate, posttestPct: after.detectionRate, deltaPct: deltaPct(before.detectionRate, after.detectionRate) },
    falsePositives: { baselinePct: before.falsePositiveRate, posttestPct: after.falsePositiveRate },
    mttd: { baselineSeconds: before.mttdSeconds, posttestSeconds: after.mttdSeconds, deltaPct: deltaPct(before.mttdSeconds, after.mttdSeconds) },
    adherence: { users: adherent, total, ratePct: ratePct(adherent, total), minConsecutiveDays: ADHERENCE_DAYS },
    practice: { attempts: allAttempts, successRatePct: ratePct(okAttempts, allAttempts), activeUsers: daysByUser.size },
    sus: {
      responses: scores.length,
      mean: susMean,
      median: median(scores),
      min: scores.length ? round1(Math.min(...scores)) : null,
      max: scores.length ? round1(Math.max(...scores)) : null,
      grade: susMean === null ? null : susGrade(susMean),
      goal: SUS_GOAL,
      meetsGoal: susMean === null ? null : susMean > SUS_GOAL,
      perQuestionMean: perQuestion,
    },
    notes,
  };
}

export type PilotReport = Awaited<ReturnType<typeof pilotReport>>;

/** Filas «Indicador, Valor, Detalle» para el CSV del reporte. */
export function reportRows(r: PilotReport): (string | number | null)[][] {
  const v = (n: number | null, unit = "") => (n === null ? null : `${n}${unit}`);
  return [
    ["Fase del piloto", r.phase, ""],
    ["Participantes", r.participants.total, `${r.participants.technical} técnicos y ${r.participants.nonTechnical} no técnicos`],
    ["Completaron diagnóstico inicial", r.diagnostic.baselineCompleted, `de ${r.participants.total}`],
    ["Completaron diagnóstico final", r.diagnostic.posttestCompleted, `de ${r.participants.total}`],
    ["Personas con ambos diagnósticos", r.diagnostic.paired, "base de las comparaciones"],
    ["Detección de phishing inicial", v(r.detection.baselinePct, " %"), "aciertos en correos maliciosos"],
    ["Detección de phishing final", v(r.detection.posttestPct, " %"), "aciertos en correos maliciosos"],
    ["Variación en la detección", v(r.detection.deltaPct, " %"), "(final - inicial) / inicial"],
    ["Falsos positivos inicial", v(r.falsePositives.baselinePct, " %"), "errores en correos legítimos"],
    ["Falsos positivos final", v(r.falsePositives.posttestPct, " %"), "errores en correos legítimos"],
    ["Tiempo de detección inicial", v(r.mttd.baselineSeconds, " s"), "MTTD humano"],
    ["Tiempo de detección final", v(r.mttd.posttestSeconds, " s"), "MTTD humano"],
    ["Variación del tiempo de detección", v(r.mttd.deltaPct, " %"), "negativa = más rápido"],
    ["Adherencia a rachas", v(r.adherence.ratePct, " %"), `${r.adherence.users} de ${r.adherence.total} con ${r.adherence.minConsecutiveDays} o más días seguidos`],
    ["Intentos de práctica", r.practice.attempts, `${r.practice.successRatePct ?? 0} % de aciertos`],
    ["SUS: respuestas", r.sus.responses, ""],
    ["SUS: media", r.sus.mean, r.sus.grade ? `${r.sus.grade}; meta > ${r.sus.goal}` : `meta > ${r.sus.goal}`],
    ["SUS: cumple la meta", r.sus.meetsGoal === null ? null : r.sus.meetsGoal ? "Sí" : "No", ""],
  ];
}
