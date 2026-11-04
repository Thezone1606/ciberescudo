// Tipos de las respuestas del piloto (API /pilot y /admin/pilot).
export type PilotPhase = "OFF" | "BASELINE" | "PRACTICE" | "POSTTEST" | "CLOSED";

export const PHASE_LABEL: Record<PilotPhase, string> = {
  OFF: "Apagado",
  BASELINE: "Diagnóstico inicial",
  PRACTICE: "Práctica",
  POSTTEST: "Evaluación final",
  CLOSED: "Cerrado",
};

export const PHASE_HELP: Record<PilotPhase, string> = {
  OFF: "El piloto no está activo: la plataforma funciona como siempre.",
  BASELINE: "Cada persona contesta el diagnóstico inicial antes de poder practicar.",
  PRACTICE: "Las personas practican con los retos y acumulan rachas.",
  POSTTEST: "Cada persona contesta de nuevo el diagnóstico y el cuestionario de usabilidad (SUS).",
  CLOSED: "Se cierra la ventana de pruebas: el diagnóstico deja de aceptar respuestas.",
};

export interface PilotStatus {
  phase: PilotPhase;
  diagnostic: { active: boolean; total: number; answered: number; pending: number; completed: boolean };
  baselineRequired: boolean;
  sus: { available: boolean; done: boolean };
}

export interface DiagnosticNext {
  phase: PilotPhase;
  total: number;
  answered: number;
  item: { id: string; title: string; index: number; payload: unknown } | null;
}

export interface SusInfo {
  available: boolean;
  done: boolean;
  questions: string[];
}

export interface PilotOverview {
  phase: PilotPhase;
  participants: number;
  diagnosticItems: { total: number; malicious: number; legitimate: number };
  baselineCompleted: number;
  posttestCompleted: number;
  susResponses: number;
}

export interface PilotReport {
  generatedAt: string;
  phase: PilotPhase;
  participants: { total: number; technical: number; nonTechnical: number; technicalSharePct: number | null };
  diagnostic: { items: { total: number; malicious: number; legitimate: number }; baselineCompleted: number; posttestCompleted: number; paired: number };
  detection: { baselinePct: number | null; posttestPct: number | null; deltaPct: number | null };
  falsePositives: { baselinePct: number | null; posttestPct: number | null };
  mttd: { baselineSeconds: number | null; posttestSeconds: number | null; deltaPct: number | null };
  adherence: { users: number; total: number; ratePct: number | null; minConsecutiveDays: number };
  practice: { attempts: number; successRatePct: number | null; activeUsers: number };
  sus: { responses: number; mean: number | null; median: number | null; min: number | null; max: number | null; grade: string | null; goal: number; meetsGoal: boolean | null; perQuestionMean: (number | null)[] };
  notes: string[];
}

export const LIKERT = ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"];
