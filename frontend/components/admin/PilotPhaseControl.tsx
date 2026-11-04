"use client";

import { useState } from "react";
import { PHASE_HELP, PHASE_LABEL, type PilotOverview, type PilotPhase } from "@/lib/pilot";
import { apiFetch } from "@/lib/session";
import { buttonClass, primaryButtonClass } from "./ui";

const PHASES: PilotPhase[] = ["OFF", "BASELINE", "PRACTICE", "POSTTEST", "CLOSED"];

// Qué cambia para las personas al entrar a cada fase: se muestra antes de confirmar.
const EFFECT: Partial<Record<PilotPhase, string>> = {
  BASELINE: "Nadie podrá practicar hasta contestar el diagnóstico inicial.",
  POSTTEST: "Se abre de nuevo el diagnóstico (evaluación final) y el cuestionario SUS.",
  CLOSED: "El diagnóstico deja de aceptar respuestas; el cuestionario SUS sigue abierto.",
  OFF: "Los avisos del piloto desaparecen. Los resultados ya registrados se conservan.",
};

/** Cambia la fase del piloto. Es una decisión con efecto sobre todas las personas, así que pide confirmación. */
export function PilotPhaseControl({ overview, onChanged }: { overview: PilotOverview; onChanged: () => void }) {
  const [pending, setPending] = useState<PilotPhase | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function apply(phase: PilotPhase) {
    setBusy(true);
    setProblem(null);
    const res = await apiFetch("/admin/pilot/phase", { method: "PUT", body: JSON.stringify({ phase }) }).catch(() => null);
    if (res?.ok) {
      setPending(null);
      onChanged();
    } else {
      const body = (await res?.json().catch(() => ({}))) as { message?: string };
      setProblem(body.message ?? "No se pudo cambiar la fase. Inténtalo de nuevo.");
    }
    setBusy(false);
  }

  return (
    <fieldset>
      <legend className="text-lg font-semibold">Fase del piloto</legend>
      <p className="mt-1 text-sm text-muted">Avanza en orden: diagnóstico inicial, práctica, evaluación final y cierre.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {PHASES.map((p) => {
          const current = overview.phase === p;
          return (
            <label
              key={p}
              className="flex cursor-pointer flex-col gap-0.5 rounded-lg bg-surface p-3 ring-1 ring-line transition-colors hover:bg-surface-hi has-[:checked]:bg-cyan/10 has-[:checked]:ring-2 has-[:checked]:ring-cyan has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan"
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="pilot-phase" checked={(pending ?? overview.phase) === p} onChange={() => setPending(p === overview.phase ? null : p)} className="size-4 accent-cyan" />
                {PHASE_LABEL[p]}
              </span>
              {current && <span className="text-xs font-medium text-cyan">Fase actual</span>}
              <span className="text-sm text-muted">{PHASE_HELP[p]}</span>
            </label>
          );
        })}
      </div>

      {pending && (
        <div className="mt-4 rounded-lg bg-warn/10 p-4 ring-1 ring-warn/40" role="group" aria-label="Confirmar cambio de fase">
          <p className="font-medium">¿Pasar a «{PHASE_LABEL[pending]}»?</p>
          {EFFECT[pending] && <p className="mt-1 text-sm text-muted">{EFFECT[pending]}</p>}
          {problem && <p role="alert" className="mt-2 text-sm text-danger">{problem}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => apply(pending)}>
              {busy ? "Aplicando…" : "Confirmar cambio"}
            </button>
            <button type="button" className={buttonClass} onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
