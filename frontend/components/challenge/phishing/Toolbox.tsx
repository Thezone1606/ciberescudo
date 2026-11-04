"use client";

import { useDraggable } from "@dnd-kit/core";
import { Flag } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { FLAGS, type FlagId, type Placement } from "@/lib/phishing";

function FlagChip({ id, label, hint, placed }: { id: FlagId; label: string; hint: string; placed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <li>
      <button
        type="button"
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{ transform: CSS.Translate.toString(transform) }}
        aria-label={`${label}. ${hint}. ${placed ? "Ya colocada." : ""} Arrastra sobre un elemento del correo.`}
        className={`flex w-full touch-none cursor-grab items-start gap-2.5 rounded-lg px-3 py-2.5 text-left ring-1 transition-colors active:cursor-grabbing ${
          isDragging ? "relative z-20 bg-danger/20 shadow-xl shadow-black/50 ring-danger" : placed ? "bg-danger/10 ring-danger/40" : "bg-surface ring-line hover:bg-surface-hi"
        }`}
      >
        <Flag size={18} className="mt-0.5 shrink-0 text-danger" fill="currentColor" fillOpacity={placed ? 0.5 : 0.15} aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-medium">{label}</span>
          <span className="block text-sm text-muted">{placed ? "Colocada" : hint}</span>
        </span>
      </button>
    </li>
  );
}

export function Toolbox({ placement }: { placement: Placement }) {
  return (
    // En pantallas pequeñas se ocultan: arrastrar hacia un correo fuera de vista no es práctico en
    // táctil, y el botón «Marcar» de cada elemento hace lo mismo.
    <section aria-labelledby="flags-title" className="hidden lg:block">
      <h2 id="flags-title" className="font-semibold">
        Banderas
      </h2>
      <p className="mt-1 text-sm text-muted">Arrástralas al elemento sospechoso.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {FLAGS.map((f) => (
          <FlagChip key={f.id} id={f.id} label={f.label} hint={f.hint} placed={!!placement[f.id]} />
        ))}
      </ul>
    </section>
  );
}
