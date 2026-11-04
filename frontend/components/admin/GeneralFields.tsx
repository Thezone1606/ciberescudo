"use client";

import { useId } from "react";
import { DEFAULT_XP, DIFFICULTY_LABEL, type ChallengeForm } from "@/lib/admin";
import type { Difficulty } from "@/lib/types";
import { describedBy, Field, inputClass } from "./ui";

/** Datos comunes a todos los tipos de reto. */
export function GeneralFields({
  form,
  set,
  errors,
  categories,
}: {
  form: ChallengeForm;
  set: (patch: Partial<ChallengeForm>) => void;
  errors: Record<string, string>;
  categories: { id: string; name: string }[];
}) {
  const uid = useId();
  const err = (k: string) => errors[k];

  return (
    <div className="flex flex-col gap-4">
      <Field label="Título" htmlFor={`${uid}-title`} error={err("title")}>
        <input id={`${uid}-title`} value={form.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={!!err("title")} aria-describedby={describedBy(`${uid}-title`, err("title"))} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" htmlFor={`${uid}-cat`} error={err("categoryId")}>
          <select id={`${uid}-cat`} value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} aria-invalid={!!err("categoryId")} aria-describedby={describedBy(`${uid}-cat`, err("categoryId"))} className={inputClass}>
            <option value="">Elige una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Dificultad" htmlFor={`${uid}-diff`} error={err("difficultyLevel")}>
          <select id={`${uid}-diff`} value={form.difficultyLevel} onChange={(e) => set({ difficultyLevel: e.target.value as Difficulty })} className={inputClass}>
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
            ))}
          </select>
        </Field>
        <Field label="XP" htmlFor={`${uid}-xp`} error={err("baseXp")} hint={`Si lo dejas vacío se usan ${DEFAULT_XP[form.difficultyLevel]} XP, según la dificultad.`}>
          <input id={`${uid}-xp`} type="number" min={1} max={200} value={form.baseXp} onChange={(e) => set({ baseXp: e.target.value })} aria-invalid={!!err("baseXp")} aria-describedby={describedBy(`${uid}-xp`, err("baseXp"), "x")} className={inputClass} />
        </Field>
        <Field label="Posición en la ruta" htmlFor={`${uid}-order`} error={err("orderIndex")} hint="Si lo dejas vacío, queda al final de la ruta.">
          <input id={`${uid}-order`} type="number" min={1} max={999} value={form.orderIndex} onChange={(e) => set({ orderIndex: e.target.value })} aria-invalid={!!err("orderIndex")} aria-describedby={describedBy(`${uid}-order`, err("orderIndex"), "x")} className={inputClass} />
        </Field>
      </div>
      <Field label="Explicación para el jugador" htmlFor={`${uid}-explain`} error={err("explanationGuide")} hint="Se muestra después de cada intento: por qué la respuesta correcta lo es.">
        <textarea id={`${uid}-explain`} rows={4} value={form.explanationGuide} onChange={(e) => set({ explanationGuide: e.target.value })} aria-invalid={!!err("explanationGuide")} aria-describedby={describedBy(`${uid}-explain`, err("explanationGuide"), "x")} className={inputClass} />
      </Field>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="size-5 accent-cyan" />
        Visible para los jugadores
      </label>
      <div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={form.isDiagnostic} disabled={form.content.type !== "phishing" && form.content.type !== "quick"} onChange={(e) => set({ isDiagnostic: e.target.checked })} className="size-5 accent-cyan" />
          Reto del diagnóstico del piloto
        </label>
        <p className="text-sm text-muted">Se usa en el diagnóstico inicial y en la evaluación final, no en la práctica. Solo correos de phishing y decisiones rápidas.</p>
        {err("isDiagnostic") && <p role="alert" className="mt-1 text-sm text-danger">{err("isDiagnostic")}</p>}
      </div>
      {err("track") && <p role="alert" className="text-sm text-danger">{err("track")}</p>}
    </div>
  );
}
