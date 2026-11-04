"use client";

import { ArrowRight, ClipboardCheck, ListChecks } from "lucide-react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import type { PilotStatus } from "@/lib/pilot";

const cta =
  "inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-5 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-cyan/90 active:scale-[0.97]";

/** Pendientes del piloto: diagnóstico (inicial o final) y cuestionario de usabilidad. Nada si no hay piloto activo. */
export function PilotNotice({ status }: { status: PilotStatus | null }) {
  if (!status || status.phase === "OFF") return null;
  const { diagnostic, sus } = status;
  const items: { key: string; icon: typeof ClipboardCheck; title: string; text: string; href: string; action: string }[] = [];

  if (diagnostic.active && !diagnostic.completed) {
    const initial = status.phase === "BASELINE";
    items.push({
      key: "diag",
      icon: ClipboardCheck,
      title: initial ? "Primero, el diagnóstico inicial" : "Evaluación final pendiente",
      text: `${diagnostic.pending} de ${diagnostic.total} correos por revisar. No verás si acertaste y no afecta tu puntaje; sirve para medir cuánto mejoras.`,
      href: "/diagnostico",
      action: diagnostic.answered > 0 ? "Continuar" : "Comenzar",
    });
  }
  if (sus.available && !sus.done) {
    items.push({
      key: "sus",
      icon: ListChecks,
      title: "Cuéntanos cómo te fue con la plataforma",
      text: "Son 10 afirmaciones y toma unos 3 minutos. Tus respuestas se analizan en conjunto.",
      href: "/encuesta",
      action: "Responder",
    });
  }
  if (!items.length) return null;

  return (
    <div className="mb-8 flex flex-col gap-3" aria-label="Pendientes del piloto">
      {items.map(({ key, icon: Icon, title, text, href, action }) => (
        <section key={key} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl bg-cyan/10 p-4 ring-1 ring-cyan/40">
          <Icon size={24} className="shrink-0 text-cyan" aria-hidden="true" />
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-0.5 text-sm text-muted">{text}</p>
          </div>
          <Link href={href} className={cta}>
            {action}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      ))}
    </div>
  );
}

export function usePilotStatus() {
  return useApi<PilotStatus>("/pilot/status");
}
