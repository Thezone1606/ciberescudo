"use client";

import { Pencil } from "lucide-react";
import { useId, useState } from "react";
import { ROLE_LABEL, shortDate, type AdminUser, type UsersResponse } from "@/lib/users";
import { buttonClass } from "./ui";
import { UserEditor } from "./UserEditor";

function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm">
        {value} de {total}
      </dd>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-hi">
        <div className="h-full bg-cyan" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm">{value}</dd>
    </div>
  );
}

const yesNo = (done: boolean) => (done ? "Completado" : "Pendiente");

/** Un usuario con su avance. Las cuentas nuevas aún no tienen actividad, así que solo muestran su alta. */
export function UserCard({ user: u, totals, departments, selfId, onChanged, onReset }: { user: AdminUser; totals: UsersResponse["totals"]; departments: { id: string; name: string }[]; selfId: string; onChanged: () => void; onReset: (user: AdminUser, password: string) => void }) {
  const [editing, setEditing] = useState(false);
  const panelId = useId();
  const isNew = u.status === "new";

  return (
    <li className={`rounded-xl bg-surface p-4 ring-1 ring-line ${u.isActive ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="break-words font-medium">{u.fullName}</span>
            {!u.isActive && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">Desactivada</span>}
          </p>
          <p className="break-all text-sm text-muted">{u.email}</p>
          <p className="mt-1 text-sm text-muted">
            {u.department.name} · {ROLE_LABEL[u.role]}
          </p>
        </div>
        <button type="button" className={buttonClass} aria-expanded={editing} aria-controls={panelId} onClick={() => setEditing((v) => !v)}>
          <Pencil size={16} aria-hidden="true" />
          {editing ? "Cerrar" : "Editar"}
        </button>
      </div>

      {isNew ? (
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Alta" value={shortDate(u.createdAt)} />
          <Stat label="Primer acceso" value="Pendiente" />
        </dl>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Progress label="Ruta corporativa" value={u.solvedAwareness} total={totals.awareness} />
          <Progress label="Ruta técnica" value={u.solvedTechnical} total={totals.technical} />
          <Stat label="XP · racha" value={`${u.xp} · ${u.streak} d`} />
          <Stat label="Intentos · aciertos" value={u.attempts ? `${u.attempts} · ${u.successRate} %` : "—"} />
          <Stat label="Último intento" value={shortDate(u.lastAttemptAt)} />
          <Stat label="Último acceso" value={shortDate(u.lastLoginAt)} />
        </dl>
      )}

      {totals.pilotPhase !== "OFF" && totals.diagnostic > 0 && !isNew && (
        <p className="mt-4 text-sm text-muted">
          Piloto: diagnóstico inicial <span className="text-text">{yesNo(u.baselineDone)}</span> · final <span className="text-text">{yesNo(u.posttestDone)}</span> · cuestionario{" "}
          <span className="text-text">{yesNo(u.susDone)}</span>
        </p>
      )}

      {editing && <UserEditor id={panelId} user={u} departments={departments} isSelf={u.id === selfId} onSaved={() => { setEditing(false); onChanged(); }} onReset={onReset} />}
    </li>
  );
}
