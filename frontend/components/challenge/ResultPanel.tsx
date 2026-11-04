import { ArrowRight, CircleCheck, CircleX, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { AttemptResult } from "@/lib/challenge";

/**
 * Los fragmentos entre «» (dominios, extensiones, comandos) van en monoespaciada: en la tipografía
 * de interfaz la I mayúscula y la l minúscula se ven idénticas, y justo ahí está el engaño.
 */
function Explanation({ text }: { text: string }) {
  return (
    <>
      {text.split(/(«[^»]+»)/).map((part, i) =>
        part.startsWith("«") ? (
          <code key={i} className="font-mono text-[0.9em] text-text">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Resultado de un intento: veredicto, XP ganado, explicación y siguiente paso. */
export function ResultPanel({
  result,
  nextId,
  nextLoaded,
  onRetry,
}: {
  result: AttemptResult;
  nextId: string | null;
  nextLoaded: boolean;
  onRetry: () => void;
}) {
  const ok = result.is_successful;
  const exhausted = !ok && result.shield_integrity === 0;

  return (
    <section aria-labelledby="result-title" className={`rounded-xl p-5 ring-1 ${ok ? "bg-ok/10 ring-ok/50" : "bg-danger/10 ring-danger/50"}`}>
      <div role="status" className="flex items-start gap-3">
        {ok ? (
          <CircleCheck size={26} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
        ) : (
          <CircleX size={26} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <h2 id="result-title" className="text-xl font-semibold">
            {ok ? "¡Correcto!" : "Aún no"}
          </h2>
          <p className="mt-1 text-muted">{result.feedback}</p>
          {ok && result.xp_awarded > 0 && (
            <p className="mt-2 font-mono text-lg text-ok">+{result.xp_awarded} XP</p>
          )}
          {!ok && (
            <p className="mt-2 text-sm text-muted">
              Escudo: <span className="font-mono text-text">{result.shield_integrity / 20}/5</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="font-medium">Por qué</h3>
        <p className="mt-1 max-w-[65ch] text-muted">
          <Explanation text={result.explanation_guide} />
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {ok && nextId && (
          <Link
            href={`/retos/${nextId}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-5 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-cyan/90 active:scale-[0.97]"
          >
            Siguiente reto
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
        {ok && nextLoaded && !nextId && <p className="text-sm text-muted">Completaste todos los retos de esta ruta.</p>}
        {!ok && !exhausted && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-5 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-cyan/90 active:scale-[0.97]"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Intentar de nuevo
          </button>
        )}
        {exhausted && <p className="text-sm text-muted">Tu escudo se agotó: podrás reintentar cuando termine la espera.</p>}
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm text-muted underline-offset-4 hover:text-text hover:underline">
          Volver a los retos
        </Link>
      </div>
    </section>
  );
}
