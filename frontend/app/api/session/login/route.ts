import { backendFetch, setRefreshCookie } from "@/lib/bff";

export async function POST(request: Request) {
  const body = await request.text();
  const res = await backendFetch("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  }).catch(() => null);
  if (!res) return Response.json({ error: "backend_unreachable" }, { status: 502 });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return Response.json(data, { status: res.status });

  await setRefreshCookie(data.refreshToken);
  return Response.json({ accessToken: data.accessToken, user: data.user });
}
