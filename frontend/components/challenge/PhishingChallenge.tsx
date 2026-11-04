"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { AttemptResponse, PhishingPayload } from "@/lib/challenge";
import { accepts, FLAGS, place, safeResponse, toggleZone, toResponse, type FlagId, type Placement, type Zone } from "@/lib/phishing";
import { EmailView } from "./phishing/EmailView";
import { Toolbox } from "./phishing/Toolbox";
import { SubmitButton } from "./SubmitButton";

const ZONE_NAME: Record<Zone["kind"], string> = {
  sender: "el remitente",
  subject: "el asunto",
  body: "el mensaje",
  link: "el enlace",
  attachment: "el adjunto",
};
const labelOf = (id: FlagId) => FLAGS.find((f) => f.id === id)!.label;

// Solo cuentan las zonas que aceptan la bandera arrastrada: los elementos anidados (enlace dentro
// del mensaje) no compiten entre sí.
const detect: CollisionDetection = (args) => {
  const flag = String(args.active.id) as FlagId;
  const droppableContainers = args.droppableContainers.filter((c) => {
    const zone = c.data.current?.zone as Zone | undefined;
    return zone ? accepts(flag, zone) : false;
  });
  return pointerWithin({ ...args, droppableContainers });
};

const zoneOf = (over: { data: { current?: Record<string, unknown> } } | null) => over?.data.current?.zone as Zone | undefined;

// Anuncios para lectores de pantalla en español (los de dnd-kit vienen en inglés).
const announcements = {
  onDragStart: ({ active }: { active: { id: string | number } }) => `Tomaste la bandera «${labelOf(String(active.id) as FlagId)}».`,
  onDragOver: ({ active, over }: { active: { id: string | number }; over: Parameters<typeof zoneOf>[0] }) => {
    const zone = zoneOf(over);
    return zone ? `«${labelOf(String(active.id) as FlagId)}» sobre ${ZONE_NAME[zone.kind]}.` : undefined;
  },
  onDragEnd: ({ over }: { over: Parameters<typeof zoneOf>[0] }) => (zoneOf(over) ? "Soltaste la bandera." : "Soltaste la bandera fuera de un elemento válido."),
  onDragCancel: () => "Cancelaste el movimiento.",
};

export function PhishingChallenge({ payload, onSubmit, busy }: { payload: PhishingPayload; onSubmit: (r: AttemptResponse) => void; busy: boolean }) {
  const [placement, setPlacement] = useState<Placement>({});
  const [notice, setNotice] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  function onDragEnd({ active, over }: DragEndEvent) {
    const flag = String(active.id) as FlagId;
    const zone = over?.data.current?.zone as Zone | undefined;
    const next = zone ? place(placement, flag, zone) : null;
    if (zone && next) {
      setPlacement(next);
      setNotice(`${labelOf(flag)}: colocada en ${ZONE_NAME[zone.kind]}.`);
    } else {
      setNotice("Esa bandera no va ahí. Suéltala sobre un elemento del correo que le corresponda.");
    }
  }

  function onToggle(zone: Zone) {
    const next = toggleZone(placement, zone);
    setPlacement(next);
    const placed = Object.values(next).includes(zone.id);
    setNotice(placed ? `Marcaste ${ZONE_NAME[zone.kind]}.` : `Quitaste la marca de ${ZONE_NAME[zone.kind]}.`);
  }

  const count = Object.keys(placement).length;

  return (
    <div>
      <p className="max-w-[65ch] text-lg">
        Revisa este correo.{" "}
        <span className="hidden lg:inline">Arrastra cada bandera al elemento sospechoso, o usa el botón «Marcar» de cada elemento.</span>
        <span className="lg:hidden">Toca «Marcar» en cada elemento sospechoso.</span> Si no hay nada raro, márcalo como legítimo.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={detect}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: "Presiona espacio para tomar la bandera, usa las flechas para moverla y espacio para soltarla. También puedes usar el botón Marcar de cada elemento del correo.",
          },
        }}
      >
        <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <Toolbox placement={placement} />
          <EmailView email={payload.email} placement={placement} onToggle={onToggle} />
        </div>
      </DndContext>

      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">
        {notice}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SubmitButton spaced={false} busy={busy} disabled={count === 0} onClick={() => onSubmit(toResponse(placement))}>
          Analizar y mitigar correo
        </SubmitButton>
        <SubmitButton spaced={false} busy={busy} variant="secondary" onClick={() => onSubmit(safeResponse())}>
          Es un correo legítimo
        </SubmitButton>
      </div>
    </div>
  );
}
