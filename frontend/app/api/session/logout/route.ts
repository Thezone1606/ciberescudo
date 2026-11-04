import { backendFetch, clearRefreshCookie } from "@/lib/bff";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth) await backendFetch("/auth/logout", { method: "POST", headers: { authorization: auth } }).catch(() => null);
  await clearRefreshCookie();
  return new Response(null, { status: 204 });
}
