"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./session";

// Lectura simple de la API. El estado se identifica por la ruta pedida, así `loading` se
// deriva (la respuesta guardada no corresponde a la ruta actual) sin setState síncrono en el efecto.
export function useApi<T>(path: string | null) {
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<{ path: string; data: T | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!path) return;
    let stale = false;
    apiFetch(path)
      .then(async (r) => ({ data: r.ok ? ((await r.json()) as T) : null, error: !r.ok }))
      .catch(() => ({ data: null, error: true }))
      .then((out) => {
        if (!stale) setRes({ path, ...out });
      });
    return () => {
      stale = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = res && res.path === path ? res : null;
  return { data: current?.data ?? null, error: current?.error ?? false, loading: path !== null && !current, reload };
}
