import type { Email } from "./challenge";

export type FlagId = "sender_spoofing" | "hidden_url" | "dangerous_attachment" | "urgency_pretext";
export type ZoneKind = "sender" | "subject" | "body" | "link" | "attachment";

export interface Zone {
  id: string;
  kind: ZoneKind;
}

export const FLAGS: { id: FlagId; label: string; hint: string }[] = [
  { id: "sender_spoofing", label: "Remitente suplantado", hint: "Dirección o dominio que imita a uno real" },
  { id: "hidden_url", label: "Enlace engañoso", hint: "El destino real no coincide con lo que dice" },
  { id: "dangerous_attachment", label: "Adjunto peligroso", hint: "Extensión doble o ejecutable camuflado" },
  { id: "urgency_pretext", label: "Pretexto de urgencia", hint: "Presión para actuar sin verificar" },
];

// Una bandera solo puede ir sobre elementos de su tipo (estructura del correo, no la respuesta):
// cada correo tiene remitente, asunto y cuerpo, y puede tener enlaces y adjuntos.
const ACCEPTS: Record<FlagId, ZoneKind[]> = {
  sender_spoofing: ["sender"],
  hidden_url: ["link"],
  dangerous_attachment: ["attachment"],
  urgency_pretext: ["subject", "body"],
};

export const accepts = (flag: FlagId, zone: Zone) => ACCEPTS[flag].includes(zone.kind);
export const flagFor = (zone: Zone) => FLAGS.find((f) => accepts(f.id, zone))!;

export function zonesFor(email: Email): Zone[] {
  const zones: Zone[] = [
    { id: "sender", kind: "sender" },
    { id: "subject", kind: "subject" },
    { id: "body", kind: "body" },
  ];
  email.body.forEach((b, i) => {
    if (typeof b !== "string") zones.push({ id: `link-${i}`, kind: "link" });
  });
  email.attachments.forEach((_, i) => zones.push({ id: `attachment-${i}`, kind: "attachment" }));
  return zones;
}

/** Cada bandera está en una sola zona a la vez. */
export type Placement = Partial<Record<FlagId, string>>;

/** Coloca (o mueve) una bandera. Devuelve null si la zona no la acepta. */
export function place(current: Placement, flag: FlagId, zone: Zone): Placement | null {
  if (!accepts(flag, zone)) return null;
  return { ...current, [flag]: zone.id };
}

export function remove(current: Placement, flag: FlagId): Placement {
  const next = { ...current };
  delete next[flag];
  return next;
}

/** Marca o desmarca la bandera de una zona (alternativa por botón al arrastre). */
export function toggleZone(current: Placement, zone: Zone): Placement {
  const flag = flagFor(zone).id;
  return current[flag] === zone.id ? remove(current, flag) : { ...current, [flag]: zone.id };
}

export const flagAt = (p: Placement, zone: Zone): FlagId | undefined =>
  (Object.keys(p) as FlagId[]).find((f) => p[f] === zone.id);

export const toResponse = (p: Placement) => ({
  identified_indicators: Object.keys(p) as FlagId[],
  action: "report_incident" as const,
});

export const safeResponse = () => ({ identified_indicators: [] as FlagId[], action: "mark_safe" as const });
