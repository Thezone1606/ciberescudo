"use client";

import { RotateCw } from "lucide-react";
import { useState } from "react";
import { ChallengePath } from "@/components/ChallengePath";
import { DepartmentStanding } from "@/components/DepartmentStanding";
import { PilotNotice, usePilotStatus } from "@/components/PilotNotice";
import { RankPanel } from "@/components/RankPanel";
import { RouteTabs } from "@/components/RouteTabs";
import { useSession } from "@/lib/session";
import type { Challenge, Track } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function PathSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6" aria-label="Cargando retos">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg bg-danger/10 p-4 ring-1 ring-danger/40">
      <p className="font-medium">No se pudieron cargar los retos.</p>
      <p className="mt-1 text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface px-4 text-sm font-medium ring-1 ring-line transition-colors hover:bg-surface-hi"
      >
        <RotateCw size={16} aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

export default function HubPage() {
  const { user } = useSession();
  const [track, setTrack] = useState<Track>("AWARENESS");
  const { data, error, loading, reload } = useApi<Challenge[]>(`/challenges?track=${track}`);
  const pilot = usePilotStatus();
  // En el diagnóstico inicial no se practica hasta terminarlo (el servidor también lo exige).
  const blocked = !!pilot.data?.baselineRequired;

  if (!user) return null;
  const done = data?.filter((c) => c.solved).length ?? 0;
  const allDone = !!data && data.length > 0 && done === data.length;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <h1 className="text-2xl font-semibold">Tus retos</h1>
        <p className="mt-1 mb-6 text-muted">Cada reto toma de 3 a 5 minutos.</p>

        <PilotNotice status={pilot.data} />

        {!blocked && (
          <div>
            <RouteTabs value={track} onChange={setTrack} />
          </div>
        )}

        <div id="route-panel" role="tabpanel" aria-labelledby={`tab-${track}`} hidden={blocked} className="mt-8">
          {loading && <PathSkeleton />}
          {error && <LoadError onRetry={reload} />}
          {data && data.length === 0 && <p className="text-muted">Esta ruta todavía no tiene retos publicados.</p>}
          {data && data.length > 0 && (
            <>
              <p className="mb-6 text-sm text-muted">
                <span className="font-mono text-text">{done}</span> de <span className="font-mono text-text">{data.length}</span>{" "}
                retos completados
              </p>
              {allDone && (
                <p className="mb-6 rounded-lg bg-ok/10 p-4 text-sm ring-1 ring-ok/40">
                  Completaste todos los retos de esta ruta. Puedes repetirlos para practicar, aunque ya no suman XP.
                </p>
              )}
              <ChallengePath challenges={data} />
            </>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-8 lg:pt-1" aria-label="Tu progreso">
        <RankPanel user={user} />
        <DepartmentStanding departmentId={user.department.id} />
      </aside>
    </div>
  );
}
