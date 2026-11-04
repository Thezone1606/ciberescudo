"use client";

import { useRef, type KeyboardEvent } from "react";
import type { Track } from "@/lib/types";

const TABS: { id: Track; label: string }[] = [
  { id: "AWARENESS", label: "Ruta corporativa" },
  { id: "TECHNICAL", label: "Ruta técnica" },
];

/** Selector segmentado con semántica de pestañas y navegación por flechas. */
export function RouteTabs({ value, onChange }: { value: Track; onChange: (t: Track) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const move = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!move) return;
    e.preventDefault();
    const next = (index + move + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Ruta de aprendizaje" className="inline-flex rounded-lg bg-surface p-1 ring-1 ring-line">
      {TABS.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls="route-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="min-h-10 rounded-md px-4 text-sm font-medium text-muted transition-colors duration-150 hover:text-text aria-selected:bg-cyan aria-selected:text-ink"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
