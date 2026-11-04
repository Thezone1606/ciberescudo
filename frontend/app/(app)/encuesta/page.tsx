"use client";

import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { primaryButtonClass } from "@/components/admin/ui";
import { LIKERT, type SusInfo } from "@/lib/pilot";
import { apiFetch } from "@/lib/session";
import { useApi } from "@/lib/useApi";

export default function SusPage() {
  const { data, error, loading, reload } = useApi<SusInfo>("/pilot/sus");
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const complete = answers.every((a) => a !== null);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!complete) return;
    setBusy(true);
    setProblem(null);
    const res = await apiFetch("/pilot/sus", { method: "POST", body: JSON.stringify({ answers }) }).catch(() => null);
    if (res?.ok || res?.status === 409) reload();
    else setProblem("No se pudo enviar el cuestionario. Inténtalo de nuevo.");
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a los retos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Cuestionario de usabilidad</h1>

      {loading && <p role="status" className="mt-6 text-muted">Cargando…</p>}
      {error && <p role="alert" className="mt-6 text-danger">No se pudo cargar el cuestionario.</p>}

      {data && data.done && (
        <section className="mt-6 flex items-start gap-3 rounded-xl bg-ok/10 p-5 ring-1 ring-ok/40" role="status">
          <CircleCheck size={26} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Gracias por tu opinión</h2>
            <p className="mt-1 text-muted">Tus respuestas ya quedaron registradas y se analizan en conjunto con las del resto del grupo.</p>
          </div>
        </section>
      )}

      {data && !data.done && !data.available && (
        <p className="mt-6 rounded-lg bg-surface p-4 ring-1 ring-line">El cuestionario todavía no está disponible. Se abre junto con la evaluación final.</p>
      )}

      {data && !data.done && data.available && (
        <form onSubmit={submit} className="mt-4" noValidate>
          <p className="max-w-[65ch] text-lg">Indica qué tan de acuerdo estás con cada afirmación sobre la plataforma. No hay respuestas buenas o malas.</p>
          <p className="mt-2 text-sm text-muted">1 = {LIKERT[0].toLowerCase()} · 5 = {LIKERT[4].toLowerCase()}</p>

          <ol className="mt-6 flex flex-col gap-6">
            {data.questions.map((q, i) => (
              <li key={i}>
                <fieldset>
                  <legend className="max-w-[65ch] font-medium">
                    <span className="mr-2 font-mono text-muted">{i + 1}.</span>
                    {q}
                  </legend>
                  <div className="mt-3 grid grid-cols-5 gap-2 sm:max-w-md">
                    {LIKERT.map((label, k) => (
                      <label
                        key={k}
                        title={label}
                        className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg bg-surface font-mono ring-1 ring-line transition-colors hover:bg-surface-hi has-[:checked]:bg-cyan has-[:checked]:text-ink has-[:checked]:ring-cyan has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan"
                      >
                        <input
                          type="radio"
                          name={`q${i}`}
                          value={k + 1}
                          checked={answers[i] === k + 1}
                          onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? k + 1 : v)))}
                          aria-label={`${k + 1}, ${label}`}
                          className="sr-only"
                        />
                        {k + 1}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          {problem && <p role="alert" className="mt-6 text-danger">{problem}</p>}
          <p className="mt-8 text-sm text-muted" aria-live="polite">
            {complete ? "Todas las afirmaciones están contestadas." : `Faltan ${answers.filter((a) => a === null).length} por contestar.`}
          </p>
          <button type="submit" disabled={!complete || busy} className={`${primaryButtonClass} mt-3`}>
            {busy ? "Enviando…" : "Enviar respuestas"}
          </button>
        </form>
      )}
    </div>
  );
}
