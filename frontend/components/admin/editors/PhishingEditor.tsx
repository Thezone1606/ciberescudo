"use client";

import { useId } from "react";
import type { PhishingContent } from "@/lib/admin";
import { describedBy, Field, inputClass } from "../ui";
import { EmailBodyEditor } from "./EmailBodyEditor";

const FLAGS = [
  { id: "sender_spoofing", label: "Remitente suplantado" },
  { id: "hidden_url", label: "Enlace engañoso" },
  { id: "dangerous_attachment", label: "Adjunto peligroso" },
  { id: "urgency_pretext", label: "Pretexto de urgencia" },
];

type HeaderKey = "fromName" | "from" | "to" | "subject" | "date";

export function PhishingEditor({ value, onChange, errors }: { value: PhishingContent; onChange: (v: PhishingContent) => void; errors: Record<string, string> }) {
  const id = useId();
  const { email } = value;
  const setEmail = (patch: Partial<PhishingContent["email"]>) => onChange({ ...value, email: { ...email, ...patch } });

  const header = (key: HeaderKey, label: string, hint?: string) => {
    const error = errors[`content.email.${key}`];
    return (
      <Field label={label} htmlFor={`${id}-${key}`} error={error} hint={hint}>
        <input
          id={`${id}-${key}`}
          value={email[key]}
          onChange={(ev) => setEmail({ [key]: ev.target.value })}
          aria-invalid={!!error}
          aria-describedby={describedBy(`${id}-${key}`, error, hint)}
          className={key === "from" || key === "to" ? `${inputClass} font-mono text-sm` : inputClass}
        />
      </Field>
    );
  };

  const toggleFlag = (flag: string) =>
    onChange({ ...value, indicators: value.indicators.includes(flag) ? value.indicators.filter((f) => f !== flag) : [...value.indicators, flag] });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {header("fromName", "Nombre del remitente")}
        {header("from", "Dirección del remitente", "Aquí va el engaño, por ejemplo un dominio con una I en lugar de la l.")}
        {header("to", "Para")}
        {header("date", "Fecha mostrada")}
        <div className="md:col-span-2">{header("subject", "Asunto")}</div>
      </div>

      <EmailBodyEditor email={email} setEmail={setEmail} errors={errors} />

      <fieldset>
        <legend className="text-sm font-medium">Respuesta correcta</legend>
        <label className="mt-2 flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={value.isLegitimate}
            onChange={(ev) => onChange({ ...value, isLegitimate: ev.target.checked, indicators: ev.target.checked ? [] : value.indicators })}
            className="size-5 accent-cyan"
          />
          Es un correo legítimo (la respuesta correcta es marcarlo como seguro)
        </label>
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {FLAGS.map((f) => (
            <label key={f.id} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" disabled={value.isLegitimate} checked={value.indicators.includes(f.id)} onChange={() => toggleFlag(f.id)} className="size-5 accent-cyan" />
              {f.label}
            </label>
          ))}
        </div>
        {errors["content.indicators"] && <p role="alert" className="mt-2 text-sm text-danger">{errors["content.indicators"]}</p>}
      </fieldset>
    </div>
  );
}
