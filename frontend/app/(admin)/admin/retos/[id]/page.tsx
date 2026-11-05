"use client";

import { useParams } from "next/navigation";
import { ChallengeForm } from "@/components/admin/ChallengeForm";
import { fromApi } from "@/lib/admin";
import { useApi } from "@/lib/useApi";

export default function EditChallengePage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading } = useApi<Parameters<typeof fromApi>[0] & { attempts: number }>(`/admin/challenges/${id}`);

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Editar reto</h2>
      {data && data.attempts > 0 && (
        <p className="mb-6 max-w-3xl text-sm text-muted">
          Este reto ya tiene {data.attempts} intentos. Si cambias la respuesta correcta, los resultados anteriores no se recalculan.
        </p>
      )}
      {loading && <p role="status" className="text-muted">Cargando reto…</p>}
      {error && <p role="alert" className="text-danger">No se encontró este reto.</p>}
      {data && <ChallengeForm key={id} id={id} initial={fromApi(data)} />}
    </div>
  );
}
