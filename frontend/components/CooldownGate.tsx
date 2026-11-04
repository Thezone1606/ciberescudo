"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { clock, CooldownDialog, useRemaining } from "./CooldownDialog";

/** Abre el aviso cuando el escudo está en 0 y deja un banner para reabrirlo mientras dura la espera. */
export function CooldownGate({ user, onReady }: { user: Profile; onReady: () => void }) {
  const remaining = useRemaining(user.cooldownUntil);
  const exhausted = user.shieldIntegrity === 0 && remaining > 0;
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const open = exhausted && dismissedFor !== user.cooldownUntil;

  // Terminó la espera: el backend ya devuelve el escudo restaurado.
  useEffect(() => {
    if (user.shieldIntegrity === 0 && remaining === 0) onReady();
  }, [user.shieldIntegrity, remaining, onReady]);

  return (
    <>
      <CooldownDialog
        until={user.cooldownUntil}
        open={open}
        onClose={() => setDismissedFor(user.cooldownUntil)}
        onReady={() => {
          setDismissedFor(user.cooldownUntil);
          onReady();
        }}
      />
      {exhausted && !open && (
        <div role="status" className="border-b border-danger/40 bg-danger/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
            <ShieldAlert size={16} className="text-danger" aria-hidden="true" />
            <span>
              Escudo agotado. Podrás reintentar en <span className="font-mono text-warn">{clock(remaining)}</span>.
            </span>
            <button type="button" onClick={() => setDismissedFor(null)} className="text-cyan underline-offset-4 hover:underline">
              Ver repaso
            </button>
          </div>
        </div>
      )}
    </>
  );
}
