"use client";

import { Check, Copy, Download, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/session";
import { buttonClass, Field, inputClass, primaryButtonClass } from "./ui";

interface Result {
  email: string;
  fullName: string;
  status: string;
  password?: string;
}
interface RowError {
  line: number;
  message: string;
}

type Mode = "one" | "many";

const PLACEHOLDER = "Ana Pérez, ana.perez@dsintelligence.com, Finanzas, COLABORADOR\nLuis Gómez, luis.gomez@dsintelligence.com, Desarrollo, ANALISTA";

/** Hoja de credenciales (CSV con BOM) para entregar por un canal seguro. */
function sheet(results: Result[]) {
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [["Correo", "Nombre", "Contraseña inicial", "Estado"], ...results.map((r) => [r.email, r.fullName, r.password ?? "", r.status])];
  return rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}

/** Invitar personas: crea las cuentas y muestra, una sola vez, la contraseña inicial de cada una. */
export function InvitePanel({ departments, onInvited }: { departments: { id: string; name: string }[]; onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("one");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("COLABORADOR");
  const [list, setList] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    setErrors([]);
    const body =
      mode === "one"
        ? { people: [{ email, fullName, departmentId: departmentId || departments[0]?.id, role }] }
        : { csv: `nombre,correo,departamento,rol\n${list.trim()}\n` };
    const res = await apiFetch("/admin/users/invite", { method: "POST", body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { results?: Result[]; errors?: RowError[] } | null;
    if (res?.ok && data?.results) {
      setResults(data.results);
      setCopied(false);
      setFullName("");
      setEmail("");
      setList("");
      onInvited();
    } else if (data?.errors?.length) {
      // En la lista pegada, la línea 1 es el encabezado que agrega esta pantalla.
      setErrors(data.errors.map((r) => ({ ...r, line: mode === "many" ? r.line - 1 : r.line })));
    } else {
      setProblem("No se pudo invitar. Revisa que el correo sea válido y que los datos estén completos.");
    }
    setBusy(false);
  }

  async function copyAll() {
    if (!results) return;
    await navigator.clipboard.writeText(results.filter((r) => r.password).map((r) => `${r.email}\t${r.password}`).join("\n")).catch(() => null);
    setCopied(true);
  }

  function download() {
    if (!results) return;
    const url = URL.createObjectURL(new Blob(["﻿" + sheet(results)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "credenciales-invitados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const created = results?.filter((r) => r.password) ?? [];

  return (
    <section aria-label="Invitar personas" className="rounded-xl bg-surface p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Invitar personas</h3>
          <p className="text-sm text-muted">Crea sus cuentas y entrégales el correo y la contraseña inicial. Aparecerán como invitadas hasta que entren.</p>
        </div>
        <button type="button" className={open ? buttonClass : primaryButtonClass} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <UserPlus size={16} aria-hidden="true" />
          {open ? "Cerrar" : "Invitar"}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <div role="group" aria-label="Cantidad de personas" className="flex w-fit gap-1 rounded-lg bg-ink p-1 ring-1 ring-line">
            {(["one", "many"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="min-h-11 rounded-md px-4 text-sm font-medium text-muted transition-colors hover:text-text aria-pressed:bg-cyan/15 aria-pressed:text-text">
                {m === "one" ? "Una persona" : "Varias a la vez"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
            {mode === "one" ? (
              <>
                <Field label="Nombre completo" htmlFor="inv-name">
                  <input id="inv-name" className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={150} required />
                </Field>
                <Field label="Correo" htmlFor="inv-mail">
                  <input id="inv-mail" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
                </Field>
                <Field label="Departamento" htmlFor="inv-dept">
                  <select id="inv-dept" className={inputClass} value={departmentId || departments[0]?.id || ""} onChange={(e) => setDepartmentId(e.target.value)}>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Rol" htmlFor="inv-role">
                  <select id="inv-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="COLABORADOR">Colaborador</option>
                    <option value="ANALISTA">Analista técnico</option>
                  </select>
                </Field>
              </>
            ) : (
              <Field
                label="Una persona por línea: nombre, correo, departamento, rol"
                htmlFor="inv-list"
                hint={`Departamentos: ${departments.map((d) => d.name).join(", ")}. El rol es COLABORADOR o ANALISTA (si lo omites, COLABORADOR). Máximo 200 personas.`}
                className="sm:col-span-2"
              >
                <textarea id="inv-list" className={`${inputClass} min-h-36 py-2 font-mono text-sm`} value={list} onChange={(e) => setList(e.target.value)} placeholder={PLACEHOLDER} required />
              </Field>
            )}

            {errors.length > 0 && (
              <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-danger sm:col-span-2">
                {errors.map((r) => (
                  <li key={`${r.line}-${r.message}`}>{mode === "many" ? `Línea ${r.line}: ` : ""}{r.message}</li>
                ))}
                <li className="list-none text-muted">No se creó ninguna cuenta. Corrige y vuelve a intentar.</li>
              </ul>
            )}
            {problem && <p role="alert" className="text-sm text-danger sm:col-span-2">{problem}</p>}
            <div className="sm:col-span-2">
              <button type="submit" className={primaryButtonClass} disabled={busy || departments.length === 0}>
                {busy ? "Creando…" : "Crear cuentas"}
              </button>
            </div>
          </form>
        </div>
      )}

      {results && (
        <div role="status" className="mt-4 rounded-lg bg-ok/10 p-4 ring-1 ring-ok/40">
          <p className="font-medium">
            {created.length > 0 ? `${created.length} ${created.length === 1 ? "cuenta creada" : "cuentas creadas"}` : "No se creó ninguna cuenta"}
            {results.length > created.length && ` · ${results.length - created.length} ya existían`}
          </p>
          {created.length > 0 && (
            <>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <caption className="sr-only">Contraseñas iniciales</caption>
                  <thead className="text-muted">
                    <tr>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Correo</th>
                      <th scope="col" className="py-1.5 font-medium">Contraseña inicial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {created.map((r) => (
                      <tr key={r.email} className="border-t border-line">
                        <td className="break-all py-1.5 pr-3">{r.email}</td>
                        <td className="py-1.5 font-mono">{r.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClass} onClick={copyAll}>
                  {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copied ? "Copiadas" : "Copiar"}
                </button>
                <button type="button" className={buttonClass} onClick={download}>
                  <Download size={16} aria-hidden="true" />
                  Descargar CSV
                </button>
                <button type="button" className={buttonClass} onClick={() => setResults(null)}>Ocultar</button>
              </div>
              <p className="mt-2 text-sm text-muted">Entrégalas por un canal seguro. No se pueden volver a consultar; si se pierde una, restablécela desde la tarjeta de la persona.</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
