"use client";

import { Plus } from "lucide-react";
import { useId } from "react";
import type { CustodyContent } from "@/lib/admin";
import { moveItem, removeAt, replaceAt } from "@/lib/lists";
import { ListControls } from "../ListControls";
import { buttonClass, describedBy, Field, inputClass } from "../ui";

export function CustodyEditor({ value, onChange, errors }: { value: CustodyContent; onChange: (v: CustodyContent) => void; errors: Record<string, string> }) {
  const id = useId();
  const set = (patch: Partial<CustodyContent>) => onChange({ ...value, ...patch });
  const e = (k: string) => errors[`content.${k}`];

  return (
    <div className="flex flex-col gap-5">
      <Field label="Escenario" htmlFor={`${id}-scenario`} error={e("scenario")} hint="Explica qué se ordena y con qué criterio (por ejemplo, de más a menos volátil).">
        <textarea id={`${id}-scenario`} rows={3} value={value.scenario} onChange={(ev) => set({ scenario: ev.target.value })} aria-invalid={!!e("scenario")} aria-describedby={describedBy(`${id}-scenario`, e("scenario"), "x")} className={inputClass} />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Elementos en el orden correcto</legend>
        <p className="mt-1 text-sm text-muted">Escríbelos en el orden que es la respuesta; el jugador los recibirá barajados.</p>
        <ol className="mt-2 flex flex-col gap-2">
          {value.order.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="w-6 shrink-0 text-center font-mono text-sm text-muted" aria-hidden="true">{i + 1}</span>
              <input value={item} onChange={(ev) => set({ order: replaceAt(value.order, i, ev.target.value) })} aria-label={`Elemento ${i + 1}`} className={inputClass} />
              <ListControls label={`elemento ${i + 1}`} index={i} length={value.order.length} onMove={(d) => set({ order: moveItem(value.order, i, d) })} onRemove={() => set({ order: removeAt(value.order, i) })} canRemove={value.order.length > 2} />
            </li>
          ))}
        </ol>
        {e("order") && <p role="alert" className="mt-2 text-sm text-danger">{e("order")}</p>}
        <button type="button" className={`${buttonClass} mt-3`} disabled={value.order.length >= 10} onClick={() => set({ order: [...value.order, ""] })}>
          <Plus size={16} aria-hidden="true" />
          Agregar elemento
        </button>
      </fieldset>
    </div>
  );
}
