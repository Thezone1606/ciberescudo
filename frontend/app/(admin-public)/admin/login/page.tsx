"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/lib/session";

/** Aviso tras cambiar la contraseña (el servidor cierra todas las sesiones). */
function ChangedNotice() {
  const changed = useSearchParams().get("cambio");
  return changed ? (
    <p role="status" className="mt-6 rounded-lg bg-ok/10 p-3 text-sm ring-1 ring-ok/40">
      Contraseña actualizada. Inicia sesión con la nueva.
    </p>
  ) : null;
}

export default function AdminLoginPage() {
  const { status, user, login } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authed" && user) router.replace(user.role === "SECOPS" ? "/admin" : "/");
  }, [status, user, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const message = await login(String(form.get("email")).trim(), String(form.get("password")), "admin");
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-cyan text-ink">
            <ShieldCheck size={24} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold tracking-tight">CiberEscudo</span>
          <span className="rounded-md bg-cyan/15 px-2 py-0.5 text-xs font-medium text-cyan">Administración</span>
        </div>

        <h1 className="mt-8 text-2xl font-semibold">Portal de administración</h1>
        <p className="mt-2 text-muted">Gestiona los retos, invita personas y sigue su avance. Solo para cuentas de administración.</p>

        <Suspense>
          <ChangedNotice />
        </Suspense>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Correo de administración
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="min-h-12 rounded-lg bg-surface px-4 text-base text-text ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-cyan focus:outline-none"
              placeholder="admin@dsintelligence.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-12 rounded-lg bg-surface px-4 text-base text-text ring-1 ring-line focus:ring-2 focus:ring-cyan focus:outline-none"
            />
          </div>

          <p role="alert" className="min-h-5 text-sm text-danger">
            {error}
          </p>

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 rounded-lg bg-cyan px-5 font-semibold text-ink transition-[transform,opacity] duration-150 enabled:active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Entrando…" : "Entrar a administración"}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          ¿Vas a practicar los retos?{" "}
          <Link href="/login" className="text-cyan underline-offset-2 hover:underline">
            Entra por la página de usuarios
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
