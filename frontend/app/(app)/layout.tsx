"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CooldownGate } from "@/components/CooldownGate";
import { useSession } from "@/lib/session";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, user, refreshProfile } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anon") router.replace("/login");
    // Las cuentas de administración tienen su propio portal.
    else if (status === "authed" && user?.role === "SECOPS") router.replace("/admin");
  }, [status, user, router]);

  if (status !== "authed" || !user || user.role === "SECOPS") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
        Cargando tu sesión…
      </div>
    );
  }

  return (
    <>
      <AppHeader user={user} />
      <CooldownGate user={user} onReady={refreshProfile} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 lg:pb-12">{children}</main>
    </>
  );
}
