"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  emptyContent, issuesToErrors, toRequest, TRACK_LABEL, TYPE_LABEL, TYPE_TRACK,
  type ApiIssue, type ChallengeForm as FormState, type Content, type ContentType,
} from "@/lib/admin";
import { apiFetch } from "@/lib/session";
import { useApi } from "@/lib/useApi";
import { CustodyEditor } from "./editors/CustodyEditor";
import { PhishingEditor } from "./editors/PhishingEditor";
import { QuickEditor } from "./editors/QuickEditor";
import { TerminalEditor } from "./editors/TerminalEditor";
import { ErrorSummary } from "./ErrorSummary";
import { GeneralFields } from "./GeneralFields";
import { buttonClass, primaryButtonClass } from "./ui";

const TYPES = Object.keys(TYPE_LABEL) as ContentType[];

export function ChallengeForm({ initial, id }: { initial: FormState; id?: string }) {
  const uid = useId();
  const router = useRouter();
  const summary = useRef<HTMLDivElement>(null);
  const categories = useApi<{ id: string; name: string }[]>("/categories");
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const editing = !!id;

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const setContent = (content: Content) => set({ content });
  const pickType = (type: ContentType) => setForm((f) => ({ ...f, track: TYPE_TRACK[type], content: emptyContent(type) }));

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setProblem(null);
    const res = await apiFetch(editing ? `/admin/challenges/${id}` : "/admin/challenges", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(toRequest(form)),
    }).catch(() => null);

    if (res?.ok) return router.push("/admin/retos");
    if (res?.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { issues?: ApiIssue[] };
      setErrors(issuesToErrors(body.issues ?? []));
      requestAnimationFrame(() => summary.current?.focus());
    } else {
      setErrors({});
      setProblem("No se pudo guardar el reto. Inténtalo de nuevo.");
    }
    setSaving(false);
  }

  const c = form.content;

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-8" noValidate>
      <ErrorSummary ref={summary} errors={errors} />
      {problem && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm ring-1 ring-danger/50">{problem}</p>}

      <fieldset>
        <legend className="text-sm font-medium">Tipo de reto</legend>
        {editing ? (
          <p className="mt-2">{TYPE_LABEL[c.type]} · Ruta {TRACK_LABEL[form.track].toLowerCase()}</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TYPES.map((t) => (
              <label key={t} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg bg-surface px-4 ring-1 ring-line has-[:checked]:bg-cyan/10 has-[:checked]:ring-2 has-[:checked]:ring-cyan has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan">
                <input type="radio" name={`${uid}-type`} checked={c.type === t} onChange={() => pickType(t)} className="size-4 accent-cyan" />
                <span>
                  {TYPE_LABEL[t]}
                  <span className="block text-sm text-muted">Ruta {TRACK_LABEL[TYPE_TRACK[t]].toLowerCase()}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <section aria-labelledby={`${uid}-general`} className="flex flex-col gap-4">
        <h2 id={`${uid}-general`} className="text-lg font-semibold">Datos generales</h2>
        <GeneralFields form={form} set={set} errors={errors} categories={categories.data ?? []} />
      </section>

      <section aria-labelledby={`${uid}-content`} className="flex flex-col gap-4">
        <h2 id={`${uid}-content`} className="text-lg font-semibold">Contenido del reto</h2>
        {c.type === "phishing" && <PhishingEditor value={c} onChange={setContent} errors={errors} />}
        {c.type === "quick" && <QuickEditor value={c} onChange={setContent} errors={errors} />}
        {c.type === "custody" && <CustodyEditor value={c} onChange={setContent} errors={errors} />}
        {c.type === "terminal" && <TerminalEditor value={c} onChange={setContent} errors={errors} />}
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButtonClass} disabled={saving}>
          {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear reto"}
        </button>
        <button type="button" className={buttonClass} onClick={() => router.push("/admin/retos")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
