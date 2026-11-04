"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Profile } from "./types";

// El access token vive solo en memoria (no en localStorage): un XSS no puede llevárselo
// y se pierde al cerrar la pestaña. El refresh token está en una cookie httpOnly del BFF.
let accessToken: string | null = null;
let inflight: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  const res = await fetch("/api/session/refresh", { method: "POST", cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  accessToken = (await res.json()).accessToken as string;
  return accessToken;
}

// El refresh token es de un solo uso: dos renovaciones simultáneas con la misma cookie harían
// que el backend las tome por una reutilización y cierre todas las sesiones. Por eso se
// serializa dentro de la pestaña y, con Web Locks, también entre pestañas.
export function refreshAccess(): Promise<string | null> {
  if (inflight) return inflight;
  const run: Promise<string | null> =
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("cyber-session-refresh", requestRefresh).then((token) => token)
      : requestRefresh();
  const shared = run.finally(() => {
    inflight = null;
  });
  inflight = shared;
  return shared;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(`/api/v1${path}`, { ...init, headers, cache: "no-store" });
  };
  let res = await send(accessToken);
  if (res.status === 401) {
    const token = await refreshAccess();
    if (token) res = await send(token);
  }
  return res;
}

type Status = "loading" | "anon" | "authed";

interface SessionValue {
  status: Status;
  user: Profile | null;
  /** Devuelve un mensaje de error en español, o null si entró. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    const res = await apiFetch("/auth/me");
    if (res.ok) setUser(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccess();
      const me = token ? await apiFetch("/auth/me") : null;
      if (cancelled) return;
      if (me?.ok) {
        setUser(await me.json());
        setStatus("authed");
      } else {
        setStatus("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    }).catch(() => null);
    if (!res) return "No se pudo conectar con el servidor. Inténtalo de nuevo.";
    if (res.status === 401) return "Correo o contraseña incorrectos.";
    if (res.status === 400) return "Revisa que el correo y la contraseña estén completos.";
    if (!res.ok) return "No se pudo conectar con el servidor. Inténtalo de nuevo.";
    const data = await res.json();
    accessToken = data.accessToken;
    setUser(data.user);
    setStatus("authed");
    return null;
  }, []);

  const logout = useCallback(async () => {
    const headers: Record<string, string> = accessToken ? { authorization: `Bearer ${accessToken}` } : {};
    await fetch("/api/session/logout", { method: "POST", headers }).catch(() => null);
    accessToken = null;
    setUser(null);
    setStatus("anon");
  }, []);

  const value = useMemo(() => ({ status, user, login, logout, refreshProfile }), [status, user, login, logout, refreshProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession debe usarse dentro de SessionProvider");
  return v;
}
