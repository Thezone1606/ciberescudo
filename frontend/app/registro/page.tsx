"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/useApi";

interface SignupInfo {
  enabled: boolean;
  requiresCode: boolean;
  domains: string[];
  departments: { id: string; name: string }[];
}

const MIN_LENGTH = 12;
const field =
  "min-h-12 rounded-lg bg-surface px-4 text-base text-text ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-cyan focus:outline-none";

export default function SignupPage() {
  const { status, user, signup } = useSession();
  const router = useRouter();
  const info = useApi<SignupInfo>("/auth/signup-info");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authed" && user) router.replace(user.role === "SECOPS" ? "/admin" : "/");
  }, [status, user, router]);

  const data = info.data;
  const local = email.split("@")[0].toLowerCase();
  const rules = [
    { ok: password.length >= MIN_LENGTH, text: `Al menos ${MIN_LENGTH} caracteres` },
    { ok: local.length < 2 || !password.toLowerCase().includes(local), text: "No contiene tu nombre de usuario" },
    { ok: repeat.length > 0 && password === repeat, text: "Las dos contraseñas coinciden" },
  ];
  const ready = rules.every((r) => r.ok) && fullName.trim().length >= 2 && email.includes("@") && (departmentId || data?.departments[0]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready || !data) return;
    setBusy(true);
    setError(null);
    const message = await signup({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      departmentId: departmentId || data.departments[0].id,
      code: data.requiresCode ? code : undefined,
    });
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
        </div>

        <h1 className="mt-8 text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="mt-2 text-muted">Con tu correo corporativo. Después resuelves tu primer reto en 3 a 5 minutos.</p>

        {info.loading && (
          <p role="status" className="mt-8 text-muted">
            Cargando…
          </p>
        )}
        {info.error && (
          <p role="alert" className="mt-8 text-danger">
            No se pudo cargar el registro. Inténtalo de nuevo.
          </p>
        )}

        {data && !data.enabled && (
          <div role="status" className="mt-8 rounded-lg bg-surface p-4 ring-1 ring-line">
            <p className="font-medium">El registro no está abierto</p>
            <p className="mt-1 text-sm text-muted">Pide a tu administrador que te invite: te dará tu correo y una contraseña inicial.</p>
          </div>
        )}

        {data?.enabled && (
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium">
                Nombre completo
              </label>
              <input id="fullName" name="fullName" autoComplete="name" required maxLength={150} className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Correo corporativo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={255}
                aria-describedby="email-hint"
                className={field}
                placeholder={`nombre@${data.domains[0]}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p id="email-hint" className="text-sm text-muted">
                Debe terminar en {data.domains.map((d) => `@${d}`).join(" o ")}.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="department" className="text-sm font-medium">
                Departamento
              </label>
              <select id="department" className={field} value={departmentId || data.departments[0]?.id || ""} onChange={(e) => setDepartmentId(e.target.value)}>
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" required maxLength={200} aria-describedby="rules" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="repeat" className="text-sm font-medium">
                Repite la contraseña
              </label>
              <input id="repeat" type={show ? "text" : "password"} autoComplete="new-password" required maxLength={200} className={field} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-cyan" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Mostrar contraseñas
            </label>

            <ul id="rules" aria-label="Requisitos de la contraseña" className="-mt-2 space-y-1 text-sm">
              {rules.map((r) => (
                <li key={r.text} className={r.ok ? "text-ok" : "text-muted"}>
                  <span aria-hidden="true">{r.ok ? "✓ " : "○ "}</span>
                  {r.text}
                  <span className="sr-only">{r.ok ? " (cumplido)" : " (pendiente)"}</span>
                </li>
              ))}
            </ul>

            {data.requiresCode && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="code" className="text-sm font-medium">
                  Código de registro
                </label>
                <input id="code" name="code" autoComplete="off" required maxLength={100} aria-describedby="code-hint" className={field} value={code} onChange={(e) => setCode(e.target.value)} />
                <p id="code-hint" className="text-sm text-muted">
                  Te lo da tu administrador.
                </p>
              </div>
            )}

            <p role="alert" className="min-h-5 text-sm text-danger">
              {error}
            </p>

            <button
              type="submit"
              disabled={busy || !ready}
              className="min-h-12 rounded-lg bg-cyan px-5 font-semibold text-ink transition-[transform,opacity] duration-150 enabled:active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Creando tu cuenta…" : "Crear cuenta"}
            </button>
          </form>
        )}

        <p className="mt-8 text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-cyan underline-offset-2 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
