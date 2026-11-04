"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import type { DepartmentRank } from "@/lib/types";

function Row({ d, mine }: { d: DepartmentRank; mine: boolean }) {
  return (
    <li className="flex items-baseline gap-3 border-b border-line py-2 text-sm last:border-0">
      <span className="w-5 font-mono text-muted">{d.rank}</span>
      <span className={`min-w-0 flex-1 truncate ${mine ? "font-semibold text-cyan" : ""}`}>
        {d.department}
        {mine && <span className="sr-only"> (tu área)</span>}
      </span>
      <span className="font-mono text-muted">{d.averageXp} XP</span>
    </li>
  );
}

/** Vista corta del ranking: los 3 primeros y, si queda fuera, el área del usuario con su posición. */
export function DepartmentStanding({ departmentId }: { departmentId: string }) {
  const { data, error, loading } = useApi<DepartmentRank[]>("/metrics/leaderboard");
  const inactive = !!data && data.every((d) => d.totalXp === 0);
  const mine = data?.find((d) => d.departmentId === departmentId);
  const outside = mine && mine.rank > 3 ? mine : null;

  return (
    <section aria-labelledby="standing-title">
      <h2 id="standing-title" className="text-base font-semibold">
        Departamentos
      </h2>

      {loading && <p role="status" className="mt-3 text-sm text-muted">Cargando clasificación…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">No se pudo cargar la clasificación.</p>}

      {data && inactive && (
        <p className="mt-3 text-sm text-muted">Aún no hay actividad. La clasificación se llena con los primeros retos resueltos.</p>
      )}

      {data && !inactive && (
        <ol className="mt-3 flex flex-col">
          {data.slice(0, 3).map((d) => (
            <Row key={d.departmentId} d={d} mine={d.departmentId === departmentId} />
          ))}
          {outside && <Row d={outside} mine />}
        </ol>
      )}

      <Link href="/clasificacion" className="mt-3 inline-block text-sm text-cyan underline-offset-4 hover:underline">
        Ver clasificación completa
      </Link>
    </section>
  );
}
