"use client";

import { useSession } from "@/lib/session";
import type { DepartmentRank } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function LeaderboardPage() {
  const { user } = useSession();
  const { data, error, loading } = useApi<DepartmentRank[]>("/metrics/leaderboard");
  const max = Math.max(1, ...(data ?? []).map((d) => d.averageXp));
  const inactive = !!data && data.every((d) => d.totalXp === 0);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Clasificación por departamento</h1>
      <p className="mt-1 text-muted">
        Compite como equipo: se ordena por el XP promedio de cada área. Nunca se muestran personas.
      </p>

      {loading && <p role="status" className="mt-8 text-muted">Cargando clasificación…</p>}
      {error && <p role="alert" className="mt-8 text-danger">No se pudo cargar la clasificación.</p>}
      {inactive && (
        <p className="mt-8 rounded-lg bg-surface p-4 text-sm ring-1 ring-line">
          Aún no hay actividad. La clasificación aparece con los primeros retos resueltos.
        </p>
      )}

      {data && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Departamentos ordenados por XP promedio</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="w-12 py-3 pr-2 pl-2 font-medium">#</th>
                <th scope="col" className="py-3 pr-4 font-medium">Departamento</th>
                <th scope="col" className="w-24 py-3 pr-4 text-right font-medium">Integrantes</th>
                <th scope="col" className="w-52 py-3 pr-4 font-medium">XP promedio</th>
                <th scope="col" className="w-24 py-3 text-right font-medium">XP total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => {
                const mine = d.departmentId === user?.department.id;
                return (
                  <tr key={d.departmentId} className={`border-b border-line last:border-0 ${mine ? "bg-surface" : ""}`}>
                    <td className="py-3.5 pr-2 pl-2 font-mono text-muted">{d.rank}</td>
                    <td className="py-3.5 pr-4 font-medium">
                      {d.department}
                      {mine && <span className="ml-2 rounded bg-cyan/15 px-1.5 py-0.5 text-xs font-medium text-cyan">Tu área</span>}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono">{d.members}</td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <div className="h-full origin-left rounded-full bg-cyan" style={{ transform: `scaleX(${d.averageXp / max})` }} />
                        </div>
                        <span className="w-12 text-right font-mono">{d.averageXp}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-mono text-muted">{d.totalXp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
