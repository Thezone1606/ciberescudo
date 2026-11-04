import { cookies } from "next/headers";

// Código de servidor: habla con el backend directamente y guarda el refresh token en una
// cookie httpOnly. El navegador nunca ve ese token; solo recibe el access token (15 min).
export const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";
const COOKIE = "cyber_rt";
const MAX_AGE = 7 * 24 * 60 * 60;

export async function setRefreshCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Detrás de Nginx con TLS la cookie es siempre segura; COOKIE_SECURE=false solo para pruebas locales por HTTP.
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
    path: "/api/session",
    maxAge: MAX_AGE,
  });
}

export async function readRefreshCookie() {
  return (await cookies()).get(COOKIE)?.value;
}

export async function clearRefreshCookie() {
  (await cookies()).delete({ name: COOKIE, path: "/api/session" });
}

export function backendFetch(path: string, init: RequestInit) {
  return fetch(`${BACKEND}/api/v1${path}`, { ...init, cache: "no-store" });
}
