"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { UserMenu } from "../UserMenu";

/** Encabezado del portal de administración: sin escudo, racha ni XP, que son del jugador. */
export function AdminHeader({ user }: { user: Profile }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-lg bg-cyan text-ink">
            <ShieldCheck size={20} strokeWidth={2.25} aria-hidden="true" />
          </span>
          CiberEscudo
          <span className="rounded-md bg-cyan/15 px-2 py-0.5 text-xs font-medium text-cyan">Administración</span>
        </Link>
        <div className="ml-auto">
          <UserMenu user={user} accountHref="/admin/cuenta" loginHref="/admin/login" />
        </div>
      </div>
    </header>
  );
}
