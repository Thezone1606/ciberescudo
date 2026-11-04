"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/session";
import { ROLE_LABEL, type AdminUser, type UserRole } from "@/lib/users";
import { buttonClass, Field, inputClass, primaryButtonClass } from "./ui";

const MESSAGE: Record<string, string> = {
  self_lockout: "No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.",
};

/** Edición de una cuenta: datos, estado y contraseña nueva (que se muestra una sola vez). */
export function UserEditor({ id, user, departments, isSelf, onSaved, onReset }: { id: string; user: AdminUser; departments: { id: string; name: string }[]; isSelf: boolean; onSaved: () => void; onReset: (user: AdminUser, password: string) => void }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [departmentId, setDepartmentId] = useState(user.department.id);
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const res = await apiFetch(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ fullName, departmentId, role, isActive }) }).catch(() => null);
    if (res?.ok) return onSaved();
    const body = (await res?.json().catch(() => ({}))) as { error?: string; code?: string };
    setProblem(MESSAGE[body.error ?? body.code ?? ""] ?? "No se pudieron guardar los cambios. Revisa los datos e inténtalo de nuevo.");
    setBusy(false);
  }

  async function reset() {
    setBusy(true);
    setProblem(null);
    const res = await apiFetch(`/admin/users/${user.id}/reset-password`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      // La contraseña la muestra la página: al volver a «nueva» la cuenta cambia de lista y esta tarjeta se desmonta.
      onReset(user, ((await res.json()) as { password: string }).password);
    } else setProblem("No se pudo restablecer la contraseña.");
    setBusy(false);
  }

  return (
    <div id={id} className="mt-4 border-t border-line pt-4">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={150} required />
        </Field>
        <Field label="Departamento" htmlFor={`${id}-dept`}>
          <select id={`${id}-dept`} className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Rol" htmlFor={`${id}-role`} hint={isSelf ? "No puedes cambiar tu propio rol." : undefined}>
          <select id={`${id}-role`} className={inputClass} value={role} onChange={(e) => setRole(e.target.value as UserRole)} disabled={isSelf}>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-1.5">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-cyan" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isSelf} />
            Cuenta activa
          </label>
          <p className="text-sm text-muted">{isSelf ? "No puedes desactivar tu propia cuenta." : "Al desactivarla se cierran sus sesiones y no podrá entrar; su avance se conserva."}</p>
        </div>

        {problem && <p role="alert" className="text-sm text-danger sm:col-span-2">{problem}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass} disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
          {!confirmReset && (
            <button type="button" className={buttonClass} onClick={() => setConfirmReset(true)} disabled={busy}>
              <KeyRound size={16} aria-hidden="true" />
              Restablecer contraseña
            </button>
          )}
        </div>
      </form>

      {confirmReset && (
        <div role="group" aria-label="Confirmar restablecimiento" className="mt-4 rounded-lg bg-warn/10 p-4 ring-1 ring-warn/40">
          <p className="font-medium">¿Generar una contraseña nueva para {user.fullName}?</p>
          <p className="mt-1 text-sm text-muted">Se cierran sus sesiones y su cuenta vuelve a figurar como nueva hasta que entre otra vez. La contraseña se muestra una sola vez.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={primaryButtonClass} onClick={reset} disabled={busy}>Generar contraseña</button>
            <button type="button" className={buttonClass} onClick={() => setConfirmReset(false)} disabled={busy}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}
