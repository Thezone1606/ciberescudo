"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CustodyChallenge } from "@/components/challenge/CustodyChallenge";
import { PhishingChallenge } from "@/components/challenge/PhishingChallenge";
import { QuickChallenge } from "@/components/challenge/QuickChallenge";
import { ResultPanel } from "@/components/challenge/ResultPanel";
import { TerminalChallenge } from "@/components/challenge/TerminalChallenge";
import type { AttemptResponse, AttemptResult, ChallengeDetail } from "@/lib/challenge";
import { apiFetch, useSession } from "@/lib/session";
import type { Challenge, Difficulty } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const DIFFICULTY: Record<Difficulty, string> = { BASIC: "Básico", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado" };

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const { refreshProfile } = useSession();
  const { data: challenge, error, loading } = useApi<ChallengeDetail>(`/challenges/${id}`);

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Tras acertar se consulta la ruta para ofrecer el siguiente reto sin resolver.
  const { data: route } = useApi<Challenge[]>(result?.is_successful && challenge ? `/challenges?track=${challenge.track}` : null);
  const nextId = route?.find((c) => !c.solved && c.id !== id)?.id ?? null;

  async function submit(response: AttemptResponse) {
    setBusy(true);
    setProblem(null);
    const seconds = Math.min(3600, Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    const res = await apiFetch(`/challenges/${id}/attempt`, {
      method: "POST",
      body: JSON.stringify({ time_taken_seconds: seconds, response }),
    }).catch(() => null);

    if (res?.ok) {
      setResult(await res.json());
    } else if (res?.status === 423) {
      setProblem("Tu escudo está agotado. Podrás reintentar cuando termine la espera.");
    } else if (res?.status === 400) {
      setProblem("No se pudo leer tu respuesta. Revisa que esté completa e inténtalo de nuevo.");
    } else {
      setProblem("No se pudo enviar tu respuesta. Inténtalo de nuevo.");
    }
    await refreshProfile(); // actualiza escudo, racha y XP del encabezado
    setBusy(false);
  }

  function retry() {
    setResult(null);
    setProblem(null);
    setAttempt((n) => n + 1);
    setStartedAt(Date.now());
  }

  const p = challenge?.payload;

  return (
    <div className="max-w-5xl">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a los retos
      </Link>

      {loading && <p role="status" className="mt-6 text-muted">Cargando reto…</p>}
      {error && <p role="alert" className="mt-6 text-danger">No se encontró este reto.</p>}

      {challenge && p && (
        <>
          <h1 className="mt-2 text-2xl font-semibold">{challenge.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {challenge.category} · {DIFFICULTY[challenge.difficulty]} · <span className="font-mono">+{challenge.baseXp} XP</span>
          </p>

          <div className="mt-6">
            {problem && (
              <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm ring-1 ring-danger/40">
                {problem}
              </p>
            )}

            {result && <ResultPanel result={result} nextId={nextId} nextLoaded={!!route} onRetry={retry} />}

            {!result && p.type === "phishing" && <PhishingChallenge key={attempt} payload={p} onSubmit={submit} busy={busy} />}
            {!result && p.type === "quick" && <QuickChallenge key={attempt} payload={p} onSubmit={submit} busy={busy} />}
            {!result && p.type === "custody" && <CustodyChallenge key={attempt} payload={p} onSubmit={submit} busy={busy} />}
            {!result && p.type === "terminal" && <TerminalChallenge key={attempt} payload={p} onSubmit={submit} busy={busy} />}
          </div>
        </>
      )}
    </div>
  );
}
