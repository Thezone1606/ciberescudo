"use client";

import { SquareTerminal } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { AttemptResponse, TerminalPayload } from "@/lib/challenge";
import { COMMANDS, type TermEnv } from "@/lib/terminal/engine";
import { SubmitButton } from "./SubmitButton";
import { XTerm } from "./terminal/XTerm";

const VERDICTS = [
  { id: "CONFIRMED", label: "Compromiso confirmado", hint: "Hay evidencia de que el incidente es real." },
  { id: "FALSE_POSITIVE", label: "Falso positivo", hint: "La alerta no corresponde a un incidente." },
] as const;

export function TerminalChallenge({ payload, onSubmit, busy }: { payload: TerminalPayload; onSubmit: (r: AttemptResponse) => void; busy: boolean }) {
  const env = useMemo<TermEnv>(
    () => ({ host: payload.host, cwd: payload.cwd, files: payload.files, whois: payload.whois }),
    [payload],
  );
  const exec = useRef<((line: string) => void) | null>(null);
  const [line, setLine] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);

  function run(e: FormEvent) {
    e.preventDefault();
    if (!line.trim()) return;
    exec.current?.(line);
    setLine("");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <section aria-labelledby="case-title" className="max-w-[65ch]">
          <h2 id="case-title" className="font-semibold">
            El caso
          </h2>
          <p className="mt-1 text-lg break-words">
            {/* Los hashes van en monoespaciada y en una sola línea de bloque para poder compararlos. */}
            {payload.scenario.split(/([0-9a-f]{64})/).map((part, i) =>
              /^[0-9a-f]{64}$/.test(part) ? (
                <code key={i} className="my-1 block font-mono text-sm break-all text-cyan">
                  {part}
                </code>
              ) : (
                part
              ),
            )}
          </p>
          <p className="mt-3 text-muted">
            <span className="font-medium text-text">Tu objetivo: </span>
            {payload.objective}
          </p>
        </section>

        <div className="mt-6">
          <XTerm env={env} onReady={(fn) => (exec.current = fn)} />
          <p className="mt-2 text-sm text-muted">
            Comandos: <code className="font-mono">{COMMANDS.join(" · ")}</code>. En la terminal usa Tab para salir con el teclado.
          </p>

          <form onSubmit={run} className="mt-4 flex gap-2">
            <label htmlFor="cmd" className="sr-only">
              Ejecutar un comando
            </label>
            <input
              id="cmd"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="ls, cat archivo, grep patrón archivo…"
              className="min-h-11 min-w-0 flex-1 rounded-lg bg-surface px-3 font-mono text-sm text-text ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-cyan focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface px-4 text-sm font-medium ring-1 ring-line transition-colors hover:bg-surface-hi"
            >
              <SquareTerminal size={16} aria-hidden="true" />
              Ejecutar
            </button>
          </form>
        </div>
      </div>

      <form
        className="lg:pt-0"
        onSubmit={(e) => {
          e.preventDefault();
          if (verdict) onSubmit({ verdict });
        }}
      >
        <fieldset>
          <legend className="font-semibold">Tu veredicto</legend>
          <div className="mt-3 flex flex-col gap-2">
            {VERDICTS.map((v) => (
              <label
                key={v.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg bg-surface px-4 py-3 ring-1 ring-line transition-colors hover:bg-surface-hi has-[:checked]:bg-cyan/10 has-[:checked]:ring-2 has-[:checked]:ring-cyan has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan"
              >
                <input type="radio" name="verdict" value={v.id} checked={verdict === v.id} onChange={() => setVerdict(v.id)} className="mt-1 size-4 shrink-0 accent-cyan" />
                <span>
                  <span className="block font-medium">{v.label}</span>
                  <span className="block text-sm text-muted">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <SubmitButton busy={busy} disabled={!verdict}>
          Emitir veredicto
        </SubmitButton>
      </form>
    </div>
  );
}
