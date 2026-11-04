"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";
import type { AttemptResponse, CustodyPayload } from "@/lib/challenge";
import { SubmitButton } from "./SubmitButton";

function Row({
  label,
  index,
  last,
  onMove,
}: {
  label: string;
  index: number;
  last: boolean;
  onMove: (to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: label });
  const arrow =
    "flex size-11 items-center justify-center rounded-md text-muted transition-colors enabled:hover:bg-surface-hi enabled:hover:text-text disabled:opacity-30";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg bg-surface py-1 pr-1 pl-2 ring-1 ${isDragging ? "relative z-10 shadow-xl shadow-black/50 ring-cyan" : "ring-line"}`}
    >
      <span className="w-6 text-center font-mono text-sm text-muted" aria-hidden="true">
        {index + 1}
      </span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar: ${label}`}
        className="flex size-11 touch-none cursor-grab items-center justify-center rounded-md text-muted hover:bg-surface-hi hover:text-text active:cursor-grabbing"
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 py-2">{label}</span>
      <button type="button" className={arrow} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Subir: ${label}`}>
        <ArrowUp size={18} aria-hidden="true" />
      </button>
      <button type="button" className={arrow} disabled={last} onClick={() => onMove(index + 1)} aria-label={`Bajar: ${label}`}>
        <ArrowDown size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

export function CustodyChallenge({ payload, onSubmit, busy }: { payload: CustodyPayload; onSubmit: (r: AttemptResponse) => void; busy: boolean }) {
  const [items, setItems] = useState(payload.items);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const move = (from: number, to: number) => setItems((cur) => arrayMove(cur, from, to));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((cur) => arrayMove(cur, cur.indexOf(String(active.id)), cur.indexOf(String(over.id))));
  }

  return (
    <div>
      <p className="max-w-[65ch] text-lg">{payload.scenario}</p>

      <div className="mt-6 max-w-2xl">
        <p className="mb-2 text-sm text-muted">Arriba: se pierde primero</p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Tomaste «${active.id}», posición ${items.indexOf(String(active.id)) + 1} de ${items.length}.`,
              onDragOver: ({ active, over }) =>
                over ? `«${active.id}» está sobre la posición ${items.indexOf(String(over.id)) + 1}.` : undefined,
              onDragEnd: ({ active, over }) =>
                over ? `Soltaste «${active.id}» en la posición ${items.indexOf(String(over.id)) + 1}.` : `Soltaste «${active.id}» sin moverlo.`,
              onDragCancel: ({ active }) => `Cancelaste el movimiento de «${active.id}».`,
            },
            screenReaderInstructions: {
              draggable: "Para reordenar, presiona espacio, mueve con las flechas y presiona espacio de nuevo para soltar. También puedes usar los botones de subir y bajar.",
            },
          }}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2">
              {items.map((label, i) => (
                <Row key={label} label={label} index={i} last={i === items.length - 1} onMove={(to) => move(i, to)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        <p className="mt-2 text-sm text-muted">Abajo: dura más</p>
      </div>

      <SubmitButton busy={busy} onClick={() => onSubmit({ order: items })}>
        Confirmar orden
      </SubmitButton>
    </div>
  );
}
