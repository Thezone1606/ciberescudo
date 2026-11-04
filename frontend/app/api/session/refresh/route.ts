import { backendFetch, clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "@/lib/bff";

export async function POST() {
  const refreshToken = await readRefreshCookie();
  if (!refreshToken) return Response.json({ error: "no_session" }, { status: 401 });

  const res = await backendFetch("/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);
  if (!res) return Response.json({ error: "backend_unreachable" }, { status: 502 });

  if (!res.ok) {
    // El backend rechazó el token (vencido, revocado o reutilizado): la cookie ya no sirve.
    if (res.status === 401) await clearRefreshCookie();
    return Response.json({ error: "no_session" }, { status: res.status });
  }
  const data = await res.json();
  await setRefreshCookie(data.refreshToken);
  return Response.json({ accessToken: data.accessToken });
}
