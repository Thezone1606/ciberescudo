"use client";

import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PhishingChallenge } from "@/components/challenge/PhishingChallenge";
import { QuickChallenge } from "@/components/challenge/QuickChallenge";
import { primaryButtonClass } from "@/components/admin/ui";
import type { AttemptResponse, PhishingPayload, QuickPayload } from "@/lib/challenge";
import type { DiagnosticNext } from "@/lib/pilot";
import { apiFetch } from "@/lib/session";
import { useApi } from "@/lib/useApi";

/** Un reto del diagnóstico: arranca su propio cronómetro al montarse (la pantalla lo reinicia con `key`). */
function Item({ item, onSubmit, busy }: { item: NonNullable<DiagnosticNext["item"]>; onSubmit: (r: AttemptResponse, seconds: number) => void; busy: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const send = (r: AttemptResponse) => onSubmit(r, Math.min(3600, Math.round((Date.now() - startedAt) / 1000)));
  const payload = item.payload as PhishingPayload | QuickPayload;
  if (payload.type === "phishing") return <PhishingChallenge payload={payload} onSubmit={send} busy={busy} />;
  if (payload.type === "quick") return <QuickChallenge payload={payload} onSubmit={send} busy={busy} />;
  return <p role="alert" className="text-danger">Este reto de diagnóstico no se puede mostrar.</p>;
}

export default function DiagnosticPage() {
  const { data, error, loading, reload } = useApi<DiagnosticNext>("/pilot/diagnostic");
  const [started, setStarted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(item: NonNullable<DiagnosticNext["item"]>, response: AttemptResponse, seconds: number) {
    setProblem(null);
    setSubmittedId(item.id);
    const res = await apiFetch(`/pilot/diagnostic/${item.id}`, { method: "POST", body: JSON.stringify({ time_taken_seconds: seconds, response }) }).catch(() => null);
    if (res?.ok || res?.status === 409) return reload(); // 409: ya estaba contestado; se pasa al siguiente
    setSubmittedId(null);
    setProblem("No se pudo guardar tu respuesta. Inténtalo de nuevo.");
  }

  const initial = data?.phase === "BASELINE";
  const title = initial ? "Diagnóstico inicial" : "Evaluación final";
  const item = data?.item ?? null;
  const waiting = !!item && item.id === submittedId; // guardando la respuesta y trayendo el siguiente

  return (
    <div className="max-w-5xl">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a los retos
      </Link>

      {loading && <p role="status" className="mt-6 text-muted">Cargando…</p>}
      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-surface p-4 ring-1 ring-line">
          El diagnóstico no está abierto en este momento.
        </p>
      )}

      {data && (
        <>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>

          {!item && (
            <section className="mt-6 flex max-w-xl items-start gap-3 rounded-xl bg-ok/10 p-5 ring-1 ring-ok/40" role="status">
              <CircleCheck size={26} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold">Listo, gracias</h2>
                <p className="mt-1 text-muted">Terminaste los {data.total} correos. {initial ? "Ya puedes empezar a practicar." : "Falta, si aún no lo hiciste, el cuestionario de usabilidad."}</p>
                <Link href="/" className={`${primaryButtonClass} mt-4`}>Ir a los retos</Link>
              </div>
            </section>
          )}

          {item && !started && data.answered === 0 && (
            <section className="mt-4 max-w-2xl">
              <p className="text-lg">Vas a revisar {data.total} correos. En cada uno marca lo que te parezca sospechoso, o indica que es legítimo.</p>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-muted marker:text-cyan">
                <li>No verás si acertaste y no suma puntos: sirve para medir cuánto mejoras con la práctica.</li>
                <li>Responde con calma pero sin buscar ayuda: lo que cuenta es tu criterio de hoy.</li>
                <li>No se puede volver a un correo ya contestado.</li>
              </ul>
              <button type="button" className={`${primaryButtonClass} mt-6`} onClick={() => setStarted(true)}>
                Comenzar
              </button>
            </section>
          )}

          {item && (started || data.answered > 0) && (
            <div className="mt-4">
              <div className="mb-6 max-w-md">
                <p className="text-sm text-muted">
                  Correo <span className="font-mono text-text">{item.index}</span> de <span className="font-mono text-text">{data.total}</span>
                </p>
                <div role="progressbar" aria-label="Avance del diagnóstico" aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={data.answered} className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full origin-left rounded-full bg-cyan transition-transform duration-300 ease-[var(--ease-out)]" style={{ transform: `scaleX(${data.answered / data.total})` }} />
                </div>
              </div>
              {problem && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm ring-1 ring-danger/40">{problem}</p>}
              <Item key={item.id} item={item} busy={waiting} onSubmit={(r, s) => submit(item, r, s)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
