"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { describedBy, Field, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { apiFetch, useSession } from "@/lib/session";

const MIN = 8;
const MAX = 12;
type FieldName = "current" | "next" | "confirm" | "form";

export default function AccountPage() {
  const uid = useId();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ field: FieldName; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (next.length < MIN || next.length > MAX) return setError({ field: "next", message: `Usa entre ${MIN} y ${MAX} caracteres.` });
    if (next !== confirm) return setError({ field: "confirm", message: "Las contraseñas no coinciden." });
    setBusy(true);
    setError(null);
    const res = await apiFetch("/auth/password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: next }) }).catch(() => null);
    if (res?.status === 204) {
      // El servidor cierra todas las sesiones al cambiar la contraseña: se vuelve a iniciar sesión con la nueva.
      await logout();
      router.replace(pathname.startsWith("/admin") ? "/admin/login?cambio=1" : "/login?cambio=1");
      return;
    }
    const body = (await res?.json().catch(() => ({}))) as { error?: string; message?: string };
    setError(
      body.error === "wrong_password"
        ? { field: "current", message: "La contraseña actual no es correcta." }
        : { field: body.error ? "next" : "form", message: body.message ?? "No se pudo cambiar la contraseña. Inténtalo de nuevo." },
    );
    setBusy(false);
  }

  const err = (f: FieldName) => (error?.field === f ? error.message : undefined);
  const field = (key: "cur" | "new" | "rep", f: FieldName, label: string, value: string, set: (v: string) => void, auto: string, hint?: string) => (
    <Field label={label} htmlFor={`${uid}-${key}`} error={err(f)} hint={hint}>
      <input id={`${uid}-${key}`} type="password" autoComplete={auto} value={value} onChange={(e) => set(e.target.value)} required aria-invalid={!!err(f)} aria-describedby={describedBy(`${uid}-${key}`, err(f), hint)} className={inputClass} />
    </Field>
  );

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <p className="mt-1 text-muted">{user?.fullName} · {user?.email}</p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5" noValidate>
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        {field("cur", "current", "Contraseña actual", current, setCurrent, "current-password")}
        {field("new", "next", "Contraseña nueva", next, setNext, "new-password", `De ${MIN} a ${MAX} caracteres. No uses tu nombre de usuario.`)}
        {field("rep", "confirm", "Repite la contraseña nueva", confirm, setConfirm, "new-password")}
        {err("form") && <p role="alert" className="text-sm text-danger">{err("form")}</p>}
        <p className="text-sm text-muted">Al cambiarla se cierran todas tus sesiones y tendrás que iniciar sesión de nuevo.</p>
        <button type="submit" disabled={busy || !current || !next || !confirm} className={primaryButtonClass}>
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
