"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClass, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { DIFFICULTY_LABEL, TRACK_LABEL, TYPE_LABEL, type AdminChallengeRow } from "@/lib/admin";
import { apiFetch } from "@/lib/session";
import { useApi } from "@/lib/useApi";

export default function AdminChallengesPage() {
  const [track, setTrack] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const query = new URLSearchParams();
  if (track) query.set("track", track);
  if (status) query.set("active", status);
  const { data, error, loading, reload } = useApi<AdminChallengeRow[]>(`/admin/challenges${query.toString() ? `?${query}` : ""}`);

  async function toggle(c: AdminChallengeRow) {
    setBusyId(c.id);
    setProblem(null);
    const res = await apiFetch(`/admin/challenges/${c.id}/active`, { method: "PATCH", body: JSON.stringify({ isActive: !c.isActive }) }).catch(() => null);
    if (!res?.ok) setProblem("No se pudo actualizar el reto. Inténtalo de nuevo.");
    setBusyId(null);
    reload();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <form className="flex flex-wrap gap-3" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
          <div className="flex min-w-40 flex-col gap-1.5">
            <label htmlFor="f-track" className="text-sm font-medium">Ruta</label>
            <select id="f-track" value={track} onChange={(e) => setTrack(e.target.value)} className={inputClass}>
              <option value="">Todas</option>
              <option value="AWARENESS">Corporativa</option>
              <option value="TECHNICAL">Técnica</option>
            </select>
          </div>
          <div className="flex min-w-40 flex-col gap-1.5">
            <label htmlFor="f-status" className="text-sm font-medium">Estado</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Retirados</option>
            </select>
          </div>
        </form>
        <Link href="/admin/retos/nuevo" className={primaryButtonClass}>
          <Plus size={16} aria-hidden="true" />
          Nuevo reto
        </Link>
      </div>

      {problem && <p role="alert" className="mt-4 text-sm text-danger">{problem}</p>}
      {loading && <p role="status" className="mt-6 text-muted">Cargando retos…</p>}
      {error && <p role="alert" className="mt-6 text-danger">No se pudieron cargar los retos.</p>}
      {data && data.length === 0 && <p className="mt-6 text-muted">No hay retos con estos filtros.</p>}

      {data && data.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <caption className="sr-only">Retos de la plataforma</caption>
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="w-12 px-3 py-3 font-medium">#</th>
                <th scope="col" className="px-3 py-3 font-medium">Reto</th>
                <th scope="col" className="px-3 py-3 font-medium">Tipo</th>
                <th scope="col" className="px-3 py-3 font-medium">Dificultad</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">XP</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Intentos</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Fallo</th>
                <th scope="col" className="px-3 py-3 font-medium">Estado</th>
                <th scope="col" className="px-3 py-3 font-medium"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-3 py-3 font-mono text-muted">{c.orderIndex}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/retos/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                      {c.title}
                    </Link>
                    <span className="block text-muted">{TRACK_LABEL[c.track]} · {c.category}</span>
                  </td>
                  <td className="px-3 py-3">
                    {TYPE_LABEL[c.type]}
                    {c.isDiagnostic && <span className="ml-2 rounded bg-cyan/15 px-1.5 py-0.5 text-xs font-medium text-cyan">Diagnóstico</span>}
                  </td>
                  <td className="px-3 py-3">{DIFFICULTY_LABEL[c.difficulty]}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.baseXp}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.attempts}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.failureRate === null ? "—" : `${c.failureRate} %`}</td>
                  <td className="px-3 py-3">
                    <span className={c.isActive ? "text-ok" : "text-muted"}>{c.isActive ? "Activo" : "Retirado"}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/retos/${c.id}`} className={buttonClass}>Editar</Link>
                      <button type="button" className={buttonClass} disabled={busyId === c.id} onClick={() => toggle(c)}>
                        {c.isActive ? "Retirar" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
