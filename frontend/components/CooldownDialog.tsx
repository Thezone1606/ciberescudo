"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function useRemaining(until: string | null) {
  const target = until ? new Date(until).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [target]);
  return Math.max(0, Math.ceil((target - now) / 1000));
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Aviso de escudo agotado: repaso breve mientras corre la espera de 2 minutos. */
export function CooldownDialog({
  until,
  open,
  onClose,
  onReady,
}: {
  until: string | null;
  open: boolean;
  onClose: () => void;
  onReady: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const remaining = useRemaining(until);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const ready = remaining === 0;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="cooldown-title"
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl bg-surface p-6 text-text shadow-2xl shadow-black/60 ring-1 ring-line"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert size={28} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <h2 id="cooldown-title" className="text-xl font-semibold">
            Escudo agotado
          </h2>
          <p className="mt-1 text-muted">Repasa este recordatorio mientras se recarga.</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-ink/60 p-4 ring-1 ring-line">
        <h3 className="font-medium">Antes de hacer clic</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-cyan">
          <li>
            Revisa el dominio del remitente letra por letra: una <code className="font-mono text-text">I</code> (i mayúscula) puede hacerse pasar por una{" "}
            <code className="font-mono text-text">l</code> (ele minúscula).
          </li>
          <li>Pasa el cursor sobre el enlace y compara su destino con lo que dice el texto.</li>
          <li>Desconfía de adjuntos con doble extensión y de mensajes que exigen actuar con urgencia.</li>
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm">
          {ready ? (
            "Tu escudo está listo."
          ) : (
            <>
              Podrás reintentar en <span className="font-mono text-base text-warn">{clock(remaining)}</span>
            </>
          )}
        </p>
        <button
          type="button"
          disabled={!ready}
          onClick={onReady}
          className="min-h-11 rounded-lg bg-cyan px-5 text-sm font-semibold text-ink transition-[transform,opacity] duration-150 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Volver a intentar
        </button>
      </div>
    </dialog>
  );
}
