import { apiFetch } from "./session";

/** Descarga un archivo de la API (con la sesión) como lo haría un enlace. Devuelve false si falló. */
export async function downloadFile(path: string, filename: string): Promise<boolean> {
  const res = await apiFetch(path).catch(() => null);
  if (!res?.ok) return false;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
