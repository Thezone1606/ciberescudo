"use client";

import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import type { Profile } from "@/lib/types";

const ROLE_LABEL = { COLABORADOR: "Colaborador", ANALISTA: "Analista técnico", SECOPS: "Administrador SecOps" } as const;

export function UserMenu({ user, accountHref = "/cuenta", loginHref = "/login" }: { user: Profile; accountHref?: string; loginHref?: string }) {
  const { logout } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initials = user.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Cuenta de ${user.fullName}`}
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full bg-surface text-sm font-semibold text-text ring-1 ring-line transition-colors hover:bg-surface-hi"
      >
        {initials}
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-12 z-40 w-64 rounded-lg bg-surface p-2 shadow-xl shadow-black/40 ring-1 ring-line"
        >
          <div className="px-3 py-2">
            <p className="truncate font-medium">{user.fullName}</p>
            <p className="truncate text-sm text-muted">
              {ROLE_LABEL[user.role]} · {user.department.name}
            </p>
          </div>
          <Link
            href={accountHref}
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-muted transition-colors hover:bg-surface-hi hover:text-text"
          >
            <KeyRound size={16} aria-hidden="true" />
            Cambiar contraseña
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace(loginHref);
            }}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-muted transition-colors hover:bg-surface-hi hover:text-text"
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
