"use client";

import { Plus } from "lucide-react";
import { useId } from "react";
import type { TerminalContent } from "@/lib/admin";
import { removeAt, replaceAt } from "@/lib/lists";
import { ListControls } from "../ListControls";
import { buttonClass, describedBy, Field, inputClass } from "../ui";
import { TerminalFilesEditor } from "./TerminalFilesEditor";

const VERDICTS = [
  { id: "CONFIRMED", label: "Compromiso confirmado" },
  { id: "FALSE_POSITIVE", label: "Falso positivo" },
] as const;

export function TerminalEditor({ value, onChange, errors }: { value: TerminalContent; onChange: (v: TerminalContent) => void; errors: Record<string, string> }) {
  const id = useId();
  const set = (patch: Partial<TerminalContent>) => onChange({ ...value, ...patch });
  const e = (k: string) => errors[`content.${k}`];

  const text = (key: "host" | "cwd" | "objective", label: string, hint?: string) => (
    <Field label={label} htmlFor={`${id}-${key}`} error={e(key)} hint={hint}>
      <input id={`${id}-${key}`} value={value[key]} onChange={(ev) => set({ [key]: ev.target.value })} aria-invalid={!!e(key)} aria-describedby={describedBy(`${id}-${key}`, e(key), hint)} className={key === "objective" ? inputClass : `${inputClass} font-mono text-sm`} />
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {text("host", "Usuario y equipo", "Formato usuario@equipo, como se ve en el prompt.")}
        {text("cwd", "Carpeta de trabajo")}
      </div>
      <Field label="Escenario" htmlFor={`${id}-scenario`} error={e("scenario")} hint="El caso que recibe el analista. Puedes incluir indicadores de compromiso (hashes, IP).">
        <textarea id={`${id}-scenario`} rows={4} value={value.scenario} onChange={(ev) => set({ scenario: ev.target.value })} aria-invalid={!!e("scenario")} aria-describedby={describedBy(`${id}-scenario`, e("scenario"), "x")} className={inputClass} />
      </Field>
      {text("objective", "Objetivo")}

      <TerminalFilesEditor files={value.files} onChange={(files) => set({ files })} errors={errors} />

      <fieldset>
        <legend className="text-sm font-medium">Consultas whois disponibles</legend>
        <div className="mt-2 flex flex-col gap-3">
          {value.whois.map((w, i) => (
            <div key={i} className="flex items-start gap-1">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[14rem_1fr]">
                <input value={w.domain} onChange={(ev) => set({ whois: replaceAt(value.whois, i, { ...w, domain: ev.target.value }) })} placeholder="dominio.example" aria-label={`Dominio ${i + 1}`} className={`${inputClass} font-mono text-sm`} />
                <textarea rows={3} value={w.text} onChange={(ev) => set({ whois: replaceAt(value.whois, i, { ...w, text: ev.target.value }) })} placeholder="Texto que devolverá whois" aria-label={`Respuesta whois ${i + 1}`} className={`${inputClass} font-mono text-sm`} />
              </div>
              <ListControls reorder={false} label={`consulta ${i + 1}`} index={i} length={value.whois.length} onMove={() => {}} onRemove={() => set({ whois: removeAt(value.whois, i) })} />
            </div>
          ))}
        </div>
        {Object.entries(errors).filter(([k]) => k.startsWith("content.whois")).map(([k, m]) => (
          <p key={k} role="alert" className="mt-2 text-sm text-danger">{m}</p>
        ))}
        <button type="button" className={`${buttonClass} mt-3`} disabled={value.whois.length >= 6} onClick={() => set({ whois: [...value.whois, { domain: "", text: "" }] })}>
          <Plus size={16} aria-hidden="true" />
          Agregar consulta
        </button>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Veredicto correcto</legend>
        <div className="mt-1 flex flex-wrap gap-x-6">
          {VERDICTS.map((v) => (
            <label key={v.id} className="flex min-h-11 items-center gap-3">
              <input type="radio" name={`${id}-verdict`} checked={value.verdict === v.id} onChange={() => set({ verdict: v.id })} className="size-5 accent-cyan" />
              {v.label}
            </label>
          ))}
        </div>
        {e("verdict") && <p role="alert" className="mt-1 text-sm text-danger">{e("verdict")}</p>}
      </fieldset>
    </div>
  );
}
