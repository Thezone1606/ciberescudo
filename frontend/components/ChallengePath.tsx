import { ArrowRight, Check, Lock, Play } from "lucide-react";
import Link from "next/link";
import type { Challenge, Difficulty } from "@/lib/types";

const DIFFICULTY: Record<Difficulty, string> = { BASIC: "Básico", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado" };

type NodeState = "done" | "current" | "locked";

/** El primer reto sin resolver es el actual; los anteriores están completados y los siguientes bloqueados. */
export function nodeStates(challenges: Challenge[]): NodeState[] {
  const firstOpen = challenges.findIndex((c) => !c.solved);
  return challenges.map((c, i) => (c.solved ? "done" : i === firstOpen ? "current" : "locked"));
}

function Marker({ state }: { state: NodeState }) {
  if (state === "done") {
    return (
      <span className="flex size-10 items-center justify-center rounded-full bg-ok/15 text-ok ring-1 ring-ok/60">
        <Check size={20} strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="node-pulse relative flex size-10 items-center justify-center rounded-full bg-cyan text-ink">
        <Play size={18} fill="currentColor" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-line">
      <Lock size={17} aria-hidden="true" />
    </span>
  );
}

export function ChallengePath({ challenges }: { challenges: Challenge[] }) {
  const states = nodeStates(challenges);
  const firstLocked = states.indexOf("locked");

  return (
    <ol className="flex flex-col">
      {challenges.map((c, i) => {
        const state = states[i];
        const last = i === challenges.length - 1;
        const meta = [c.category, DIFFICULTY[c.difficulty]].filter(Boolean).join(" · ");
        return (
          <li
            key={c.id}
            aria-current={state === "current" ? "step" : undefined}
            className={`relative flex gap-4 last:pb-0 ${state === "done" ? "pb-4 sm:pb-6" : "pb-6"}`}
          >
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-5 top-10 bottom-0 w-0.5 -translate-x-1/2 ${state === "done" ? "bg-ok/50" : "bg-line"}`}
              />
            )}
            <div className="relative z-10 shrink-0">
              <Marker state={state} />
            </div>

            <div
              className={`min-w-0 flex-1 ${state === "current" ? "-mt-1.5 rounded-lg bg-surface p-4 ring-1 ring-cyan/40" : "pt-2 sm:pt-1.5"}`}
            >
              {state === "done" ? (
                <h3 className="text-base font-medium">
                  <Link href={`/retos/${c.id}`} title="Practicar de nuevo" className="underline decoration-muted/50 underline-offset-4 hover:decoration-text">
                    {c.title}
                    <span className="sr-only">. Completado. Practicar de nuevo</span>
                  </Link>
                </h3>
              ) : (
                <h3 className={`text-base font-medium ${state === "locked" ? "text-muted" : "text-text"}`}>
                  {c.title}
                  {state === "locked" && <span className="sr-only">. Bloqueado: completa el reto anterior</span>}
                </h3>
              )}

              {/* Los completados se compactan en móvil para que el reto actual quede a la vista. */}
              <p className={`mt-1 text-sm text-muted ${state === "done" ? "hidden sm:block" : ""}`}>
                {meta} · <span className="font-mono">+{c.baseXp} XP</span>
                              </p>

              {state === "current" && (
                <Link
                  href={`/retos/${c.id}`}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-5 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-cyan/90 active:scale-[0.97]"
                >
                  Iniciar reto
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
              {i === firstLocked && (
                <p className="mt-1 text-sm text-muted" aria-hidden="true">
                  Completa el reto anterior
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
