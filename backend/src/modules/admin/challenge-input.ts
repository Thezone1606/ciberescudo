import { z } from "zod";

// Formulario de administración de un reto. Es la forma «legible» que edita SecOps; el servidor la
// convierte a payload_config + solution (challenge-convert.ts) y valida todo antes de guardar.

const text = (max: number) =>
  z.string({ error: "Este campo es obligatorio" }).trim().min(1, "No puede estar vacío").max(max, `Máximo ${max} caracteres`);

export const FLAG_IDS = ["sender_spoofing", "hidden_url", "dangerous_attachment", "urgency_pretext"] as const;
const httpUrl = z.string().trim().max(300, "Máximo 300 caracteres").regex(/^https?:\/\/[^\s]+$/, "Debe ser una dirección http:// o https://");

const email = z.object({
  fromName: text(80),
  from: text(120),
  to: text(120),
  subject: text(160),
  date: text(60),
  body: z
    .array(z.union([text(1200), z.object({ link: text(120), href: httpUrl })]))
    .min(1, "Agrega al menos un párrafo")
    .max(12, "Máximo 12 bloques"),
  attachments: z.array(z.object({ name: text(80), size: text(20) })).max(4, "Máximo 4 adjuntos").default([]),
});

const phishing = z.object({
  type: z.literal("phishing"),
  email,
  indicators: z.array(z.enum(FLAG_IDS)).max(4),
  isLegitimate: z.boolean().default(false),
});

const quick = z.object({
  type: z.literal("quick"),
  scenario: text(700),
  question: text(200),
  options: z.array(text(240)).min(2, "Agrega al menos 2 opciones").max(6, "Máximo 6 opciones"),
  correctIndex: z.number().int().min(0),
});

const custody = z.object({
  type: z.literal("custody"),
  scenario: text(700),
  // Se captura en el orden correcto; el servidor lo baraja para el jugador.
  order: z.array(text(100)).min(2, "Agrega al menos 2 elementos").max(10, "Máximo 10 elementos"),
});

const terminalFile = z.object({
  name: z.string().trim().regex(/^[\w.-]{1,60}$/, "Solo letras, números, punto, guion y guion bajo"),
  binary: z.boolean().default(false),
  content: z.string().max(8000, "Máximo 8000 caracteres").optional(),
  sha256: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64}$/, "Debe ser un SHA-256 de 64 caracteres hexadecimales").optional(),
  size: z.string().trim().max(20).optional(),
});

const terminal = z.object({
  type: z.literal("terminal"),
  host: z.string().trim().regex(/^[\w.-]{1,40}@[\w.-]{1,40}$/, "Con el formato usuario@equipo"),
  cwd: z.string().trim().regex(/^[\w~/.-]{1,60}$/, "Ruta no válida"),
  scenario: text(900),
  objective: text(300),
  files: z.array(terminalFile).min(1, "Agrega al menos un archivo").max(8, "Máximo 8 archivos"),
  whois: z
    .record(z.string().trim().toLowerCase().regex(/^[a-z0-9.-]{3,80}$/, "Dominio no válido"), text(2000))
    .default({}),
  verdict: z.enum(["CONFIRMED", "FALSE_POSITIVE"], { error: "Elige un veredicto" }),
});

export const contentSchema = z.discriminatedUnion("type", [phishing, quick, custody, terminal]);

const TRACK_BY_TYPE = { phishing: "AWARENESS", quick: "AWARENESS", custody: "TECHNICAL", terminal: "TECHNICAL" } as const;

export const challengeInput = z
  .object({
    title: text(200),
    categoryId: z.string({ error: "Elige una categoría" }).uuid("Elige una categoría"),
    track: z.enum(["AWARENESS", "TECHNICAL"], { error: "Elige una ruta" }),
    difficultyLevel: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"], { error: "Elige una dificultad" }),
    baseXp: z.number().int().min(1, "Mínimo 1").max(200, "Máximo 200").optional(),
    orderIndex: z.number().int().min(1).max(999).optional(),
    explanationGuide: text(1500),
    isActive: z.boolean().default(true),
    // Reto del diagnóstico del piloto (inicial y final): no aparece en la práctica.
    isDiagnostic: z.boolean().default(false),
    content: contentSchema,
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const c = v.content;

    if (TRACK_BY_TYPE[c.type] !== v.track) {
      issue(["track"], c.type === "phishing" || c.type === "quick" ? "Este tipo de reto pertenece a la ruta corporativa" : "Este tipo de reto pertenece a la ruta técnica");
    }

    if (v.isDiagnostic && c.type !== "phishing" && c.type !== "quick") {
      issue(["isDiagnostic"], "El diagnóstico solo admite correos de phishing o decisiones rápidas");
    }

    if (c.type === "phishing") {
      const links = c.email.body.some((b) => typeof b !== "string");
      if (new Set(c.indicators).size !== c.indicators.length) issue(["content", "indicators"], "Hay señales repetidas");
      if (c.isLegitimate && c.indicators.length) issue(["content", "indicators"], "Un correo legítimo no debe tener señales de riesgo");
      if (!c.isLegitimate && !c.indicators.length) issue(["content", "indicators"], "Marca al menos una señal de riesgo o declara el correo como legítimo");
      if (c.indicators.includes("hidden_url") && !links) issue(["content", "indicators"], "Marcaste un enlace engañoso, pero el correo no tiene enlaces");
      if (c.indicators.includes("dangerous_attachment") && !c.email.attachments.length) issue(["content", "indicators"], "Marcaste un adjunto peligroso, pero el correo no tiene adjuntos");
    }

    if (c.type === "quick") {
      if (c.correctIndex >= c.options.length) issue(["content", "correctIndex"], "Elige cuál es la opción correcta");
      if (new Set(c.options.map((o) => o.toLowerCase())).size !== c.options.length) issue(["content", "options"], "Hay opciones repetidas");
    }

    if (c.type === "custody" && new Set(c.order.map((o) => o.toLowerCase())).size !== c.order.length) {
      issue(["content", "order"], "Hay elementos repetidos");
    }

    if (c.type === "terminal") {
      const names = c.files.map((f) => f.name);
      if (new Set(names).size !== names.length) issue(["content", "files"], "Hay archivos con el mismo nombre");
      c.files.forEach((f, i) => {
        if (f.binary && !f.sha256) issue(["content", "files", i, "sha256"], "Un archivo binario necesita su SHA-256");
        if (!f.binary && !f.content) issue(["content", "files", i, "content"], "Un archivo de texto necesita contenido");
      });
    }
  });

export type ChallengeInput = z.infer<typeof challengeInput>;
export type ContentInput = z.infer<typeof contentSchema>;
