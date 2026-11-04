"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { Flag, Paperclip } from "lucide-react";
import type { ReactNode } from "react";
import type { Email } from "@/lib/challenge";
import { accepts, flagAt, flagFor, zonesFor, type FlagId, type Placement, type Zone } from "@/lib/phishing";

/** Elemento del correo que puede recibir una bandera, arrastrada o con el botón de marcar. */
function ZoneBox({
  zone,
  placement,
  onToggle,
  children,
  className = "",
}: {
  zone: Zone;
  placement: Placement;
  onToggle: (z: Zone) => void;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id, data: { zone } });
  const { active } = useDndContext();
  const flag = flagFor(zone);
  const marked = flagAt(placement, zone) !== undefined;
  const canReceive = !!active && accepts(String(active.id) as FlagId, zone);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-md px-2 py-1.5 transition-[background-color,box-shadow] duration-150 ${
        isOver && canReceive ? "bg-danger/15 ring-2 ring-danger" : canReceive ? "outline-1 outline-dashed outline-danger/70" : marked ? "bg-danger/10 ring-1 ring-danger/50" : ""
      } ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-[min(13rem,100%)] flex-1">{children}</div>
        <button
          type="button"
          aria-pressed={marked}
          aria-label={marked ? `Quitar la marca «${flag.label}»` : `Marcar como ${flag.label.toLowerCase()}`}
          onClick={() => onToggle(zone)}
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ring-1 transition-colors ${
            marked ? "bg-danger/20 text-text ring-danger" : "text-muted ring-line hover:bg-surface-hi hover:text-text"
          }`}
        >
          <Flag size={14} fill="currentColor" fillOpacity={marked ? 0.6 : 0} aria-hidden="true" className={marked ? "text-danger" : ""} />
          {marked ? flag.label : `Marcar: ${flag.label}`}
        </button>
      </div>
    </div>
  );
}

export function EmailView({ email, placement, onToggle }: { email: Email; placement: Placement; onToggle: (z: Zone) => void }) {
  const zones = zonesFor(email);
  const zone = (id: string) => zones.find((z) => z.id === id)!;
  const row = (label: string, value: ReactNode) => (
    <p className="flex gap-2 text-sm">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </p>
  );

  return (
    <article aria-label="Correo para analizar" className="min-w-0 rounded-xl bg-surface p-3 ring-1 ring-line sm:p-4">
      <div className="flex flex-col gap-0.5">
        <ZoneBox zone={zone("sender")} placement={placement} onToggle={onToggle}>
          {row("De:", <>{email.fromName} <code className="font-mono text-[0.8rem]">&lt;{email.from}&gt;</code></>)}
        </ZoneBox>
        <div className="px-2 py-1">{row("Para:", <code className="font-mono text-[0.8rem]">{email.to}</code>)}</div>
        <div className="px-2 py-1">{row("Fecha:", email.date)}</div>
        <ZoneBox zone={zone("subject")} placement={placement} onToggle={onToggle}>
          {row("Asunto:", <strong className="font-semibold">{email.subject}</strong>)}
        </ZoneBox>
      </div>

      <hr className="my-3 border-line" />

      <ZoneBox zone={zone("body")} placement={placement} onToggle={onToggle}>
        <div className="flex flex-col gap-3">
          {email.body.map((b, i) =>
            typeof b === "string" ? (
              <p key={i} className="max-w-[65ch]">{b}</p>
            ) : (
              <ZoneBox key={i} zone={zone(`link-${i}`)} placement={placement} onToggle={onToggle}>
                <p className="text-cyan underline underline-offset-4">{b.link}</p>
                <p className="mt-1 text-xs text-muted">
                  Destino real: <code className="font-mono break-all text-text">{b.href}</code>
                </p>
              </ZoneBox>
            ),
          )}
        </div>
      </ZoneBox>

      {email.attachments.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
          {email.attachments.map((a, i) => (
            <ZoneBox key={a.name} zone={zone(`attachment-${i}`)} placement={placement} onToggle={onToggle}>
              <p className="flex items-center gap-2 text-sm">
                <Paperclip size={16} className="shrink-0 text-muted" aria-hidden="true" />
                <code className="font-mono break-all">{a.name}</code>
                <span className="text-muted">{a.size}</span>
              </p>
            </ZoneBox>
          ))}
        </div>
      )}
    </article>
  );
}
