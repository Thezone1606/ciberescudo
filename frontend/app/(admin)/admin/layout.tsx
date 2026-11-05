"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";

const TABS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/retos", label: "Retos" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/piloto", label: "Piloto" },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = user?.role === "SECOPS";

  // La interfaz solo oculta lo que el backend ya prohíbe: /admin/* responde 403 a otros roles.
  useEffect(() => {
    if (user && !allowed) router.replace("/");
  }, [user, allowed, router]);

  if (!allowed) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Administración</h1>
      <nav aria-label="Administración" className="mt-4 flex gap-1 border-b border-line">
        {TABS.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="-mb-px min-h-11 border-b-2 border-transparent px-4 py-2.5 text-sm text-muted transition-colors hover:text-text aria-[current=page]:border-cyan aria-[current=page]:text-text"
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
