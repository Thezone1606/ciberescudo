"use client";

import { forwardRef } from "react";

const LABEL: Record<string, string> = {
  isDiagnostic: "Diagnóstico", title: "Título", categoryId: "Categoría", track: "Ruta", difficultyLevel: "Dificultad", baseXp: "XP", orderIndex: "Orden",
  explanationGuide: "Explicación", scenario: "Escenario", question: "Pregunta", options: "Opciones", correctIndex: "Opción correcta",
  order: "Orden de los elementos", email: "Correo", fromName: "Nombre del remitente", from: "Remitente", to: "Para", subject: "Asunto",
  date: "Fecha", body: "Cuerpo", attachments: "Adjuntos", indicators: "Señales", files: "Archivos", whois: "Whois", host: "Equipo",
  cwd: "Carpeta", objective: "Objetivo", verdict: "Veredicto", name: "Nombre", sha256: "SHA-256", content: "Contenido", href: "Destino", link: "Texto del enlace",
};

/** «content.files.0.sha256» → «Archivos 1 › SHA-256». */
export function labelFor(path: string): string {
  const parts = path.split(".").filter((p) => p !== "content");
  const out: string[] = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) out[out.length - 1] = `${out[out.length - 1]} ${Number(p) + 1}`;
    else out.push(LABEL[p] ?? p);
  }
  return out.join(" › ") || "Formulario";
}

/** Resumen de validación: recibe el foco al aparecer para que se anuncie y se pueda saltar a corregir. */
export const ErrorSummary = forwardRef<HTMLDivElement, { errors: Record<string, string> }>(function ErrorSummary({ errors }, ref) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg bg-danger/10 p-4 ring-1 ring-danger/50 focus:outline-2 focus:outline-danger">
      <p className="font-medium">
        {entries.length === 1 ? "Hay 1 campo por corregir." : `Hay ${entries.length} campos por corregir.`}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {entries.map(([path, message]) => (
          <li key={path}>
            <span className="font-medium">{labelFor(path)}:</span> {message}
          </li>
        ))}
      </ul>
    </div>
  );
});
