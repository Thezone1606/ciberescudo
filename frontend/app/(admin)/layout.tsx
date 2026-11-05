"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useSession } from "@/lib/session";

/**
 * Portal de administración: su propia entrada y su propio encabezado. Solo cuentas SECOPS; el backend
 * lo exige de todos modos, esto solo evita mostrar pantallas que no les corresponden.
 */
export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  const { status, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anon") router.replace("/admin/login");
    else if (status === "authed" && user && user.role !== "SECOPS") router.replace("/");
  }, [status, user, router]);

  if (status !== "authed" || !user || user.role !== "SECOPS") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
        Cargando tu sesión…
      </div>
    );
  }

  return (
    <>
      <AdminHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8">{children}</main>
    </>
  );
}
