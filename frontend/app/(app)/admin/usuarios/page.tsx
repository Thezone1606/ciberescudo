"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { buttonClass, inputClass } from "@/components/admin/ui";
import { UserCard } from "@/components/admin/UserCard";
import type { Filters } from "@/lib/admin";
import { useSession } from "@/lib/session";
import type { AdminUser, UsersResponse } from "@/lib/users";
import { useApi } from "@/lib/useApi";

type Tab = "new" | "existing";

const TAB_HELP: Record<Tab, string> = {
  new: "Cuentas creadas que todavía no han iniciado sesión. Aquí puedes corregir sus datos o generarles una contraseña nueva.",
  existing: "Personas que ya entraron a la plataforma, con su avance en los retos y en el piloto.",
};

export default function AdminUsersPage() {
  const { user: me } = useSession();
  const [tab, setTab] = useState<Tab>("existing");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [fresh, setFresh] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const query = new URLSearchParams();
  if (department) query.set("department", department);
  if (search.trim()) query.set("search", search.trim());
  const users = useApi<UsersResponse>(`/admin/users${query.toString() ? `?${query}` : ""}`);
  const filters = useApi<Filters>("/admin/filters");

  const all = users.data?.users ?? [];
  const groups: Record<Tab, AdminUser[]> = { new: all.filter((u) => u.status === "new"), existing: all.filter((u) => u.status === "existing") };
  const shown = groups[tab];
  const departments = filters.data?.departments ?? [];

  async function copy() {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh.password).catch(() => null);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <p className="mt-1 text-muted">Consulta el avance de cada persona y administra sus cuentas.</p>
      </div>

      {fresh && (
        <div role="status" className="rounded-lg bg-ok/10 p-4 ring-1 ring-ok/40">
          <p className="font-medium">Contraseña nueva de {fresh.name}</p>
          <p className="break-all text-sm text-muted">{fresh.email}</p>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <code className="break-all rounded bg-ink px-3 py-2 font-mono text-base">{fresh.password}</code>
            <button type="button" className={buttonClass} onClick={copy}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? "Copiada" : "Copiar"}
            </button>
            <button type="button" className={buttonClass} onClick={() => setFresh(null)}>Ocultar</button>
          </p>
          <p className="mt-2 text-sm text-muted">Entrégala por un canal seguro. No se puede volver a consultar; si se pierde, genera otra.</p>
        </div>
      )}

      <div role="tablist" aria-label="Tipo de usuario" className="flex gap-1 rounded-lg bg-surface p-1 ring-1 ring-line sm:w-fit">
        {(["existing", "new"] as const).map((t) => (
          <button
            key={t}
            id={`utab-${t}`}
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-controls="users-panel"
            onClick={() => setTab(t)}
            className="min-h-11 flex-1 rounded-md px-4 text-sm font-medium text-muted transition-colors hover:text-text aria-selected:bg-cyan/15 aria-selected:text-text sm:flex-none"
          >
            {t === "existing" ? "Existentes" : "Nuevos"} <span className="font-mono">({groups[t].length})</span>
          </button>
        ))}
      </div>

      <form className="flex flex-wrap gap-3" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        <div className="flex min-w-48 flex-col gap-1.5">
          <label htmlFor="u-dept" className="text-sm font-medium">Departamento</label>
          <select id="u-dept" className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Todos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5 sm:max-w-sm">
          <label htmlFor="u-search" className="text-sm font-medium">Buscar por nombre o correo</label>
          <input id="u-search" type="search" className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
        </div>
      </form>

      <div id="users-panel" role="tabpanel" aria-labelledby={`utab-${tab}`}>
        <p className="mb-4 text-sm text-muted">{TAB_HELP[tab]}</p>
        {users.loading && <p role="status" className="text-muted">Cargando usuarios…</p>}
        {users.error && <p role="alert" className="text-danger">No se pudieron cargar los usuarios.</p>}
        {users.data && shown.length === 0 && (
          <p className="text-muted">{tab === "new" ? "No hay cuentas pendientes de primer acceso." : "Todavía nadie con ese filtro ha iniciado sesión."}</p>
        )}
        {users.data && shown.length > 0 && (
          <ul className="flex flex-col gap-3">
            {shown.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                totals={users.data!.totals}
                departments={departments}
                selfId={me?.id ?? ""}
                onChanged={users.reload}
                onReset={(target, password) => {
                  setCopied(false);
                  setFresh({ name: target.fullName, email: target.email, password });
                  users.reload();
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
