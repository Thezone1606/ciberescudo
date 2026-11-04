"use client";

import { LayoutDashboard, Route, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { UserMenu } from "./UserMenu";

const NAV = [
  { href: "/", label: "Retos", Icon: Route },
  { href: "/clasificacion", label: "Clasificación", Icon: Trophy },
] as const;

// Solo el rol SECOPS ve el acceso a administración (el backend lo exige de todos modos).
const ADMIN_NAV = { href: "/admin", label: "Administración", Icon: LayoutDashboard } as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/retos") : pathname.startsWith(href));
}

export function AppHeader({ user }: { user: Profile }) {
  const isActive = useActive();
  const nav = user.role === "SECOPS" ? [...NAV, ADMIN_NAV] : [...NAV];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-4 py-2 sm:gap-y-2 sm:py-3 lg:flex-nowrap">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-lg bg-cyan text-ink">
              <ShieldCheck size={20} strokeWidth={2.25} aria-hidden="true" />
            </span>
            CiberEscudo
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-text aria-[current=page]:bg-surface aria-[current=page]:text-text"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="order-last w-full lg:order-none lg:ml-auto lg:w-auto">
            <StatusBar user={user} />
          </div>
          <div className="ml-auto lg:ml-0">
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className={`mx-auto grid max-w-md ${nav.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {nav.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted transition-colors aria-[current=page]:text-cyan"
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
