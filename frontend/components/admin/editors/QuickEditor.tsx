"use client";

import { Plus } from "lucide-react";
import { useId } from "react";
import type { QuickContent } from "@/lib/admin";
import { moveItem, removeAt, replaceAt } from "@/lib/lists";
import { ListControls } from "../ListControls";
import { buttonClass, describedBy, Field, inputClass } from "../ui";

export function QuickEditor({ value, onChange, errors }: { value: QuickContent; onChange: (v: QuickContent) => void; errors: Record<string, string> }) {
  const id = useId();
  const set = (patch: Partial<QuickContent>) => onChange({ ...value, ...patch });

  function move(i: number, delta: -1 | 1) {
    const options = moveItem(value.options, i, delta);
    if (options === value.options) return;
    // La opción correcta viaja con su texto cuando se reordena.
    const correct = value.correctIndex === i ? i + delta : value.correctIndex === i + delta ? i : value.correctIndex;
    set({ options, correctIndex: correct });
  }

  function remove(i: number) {
    const options = removeAt(value.options, i);
    const c = value.correctIndex;
    set({ options, correctIndex: c === i ? 0 : c > i ? c - 1 : c });
  }

  const e = (k: string) => errors[`content.${k}`];

  return (
    <div className="flex flex-col gap-5">
      <Field label="Escenario" htmlFor={`${id}-scenario`} error={e("scenario")} hint="La situación que enfrenta la persona.">
        <textarea id={`${id}-scenario`} rows={3} value={value.scenario} onChange={(ev) => set({ scenario: ev.target.value })} aria-invalid={!!e("scenario")} aria-describedby={describedBy(`${id}-scenario`, e("scenario"), "x")} className={inputClass} />
      </Field>
      <Field label="Pregunta" htmlFor={`${id}-question`} error={e("question")}>
        <input id={`${id}-question`} value={value.question} onChange={(ev) => set({ question: ev.target.value })} aria-invalid={!!e("question")} aria-describedby={describedBy(`${id}-question`, e("question"))} className={inputClass} />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Opciones (marca la correcta)</legend>
        <div className="mt-2 flex flex-col gap-2">
          {value.options.map((text, i) => (
            <div key={i} className="flex items-center gap-1">
              <input type="radio" name={`${id}-correct`} checked={value.correctIndex === i} onChange={() => set({ correctIndex: i })} aria-label={`La opción ${i + 1} es la correcta`} className="size-5 shrink-0 accent-cyan" />
              <input value={text} onChange={(ev) => set({ options: replaceAt(value.options, i, ev.target.value) })} aria-label={`Texto de la opción ${i + 1}`} className={inputClass} />
              <ListControls label={`opción ${i + 1}`} index={i} length={value.options.length} onMove={(d) => move(i, d)} onRemove={() => remove(i)} canRemove={value.options.length > 2} />
            </div>
          ))}
        </div>
        {(e("options") || e("correctIndex")) && <p role="alert" className="mt-2 text-sm text-danger">{e("options") ?? e("correctIndex")}</p>}
        <button type="button" className={`${buttonClass} mt-3`} disabled={value.options.length >= 6} onClick={() => set({ options: [...value.options, ""] })}>
          <Plus size={16} aria-hidden="true" />
          Agregar opción
        </button>
      </fieldset>
    </div>
  );
}
