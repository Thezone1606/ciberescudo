import { describe, expect, it } from "vitest";
import type { Email } from "../lib/challenge";
import { accepts, flagAt, flagFor, place, remove, safeResponse, toggleZone, toResponse, zonesFor } from "../lib/phishing";

const email: Email = {
  fromName: "X", from: "x@y.test", to: "a@b.test", subject: "s", date: "d",
  body: ["hola", { link: "texto", href: "http://z.example" }, "adiós"],
  attachments: [{ name: "a.pdf.exe", size: "1 KB" }, { name: "b.txt", size: "1 KB" }],
};
const zones = zonesFor(email);
const z = (id: string) => zones.find((x) => x.id === id)!;

describe("zonas", () => {
  it("el correo expone remitente, asunto, cuerpo, enlaces y adjuntos", () => {
    expect(zones.map((x) => x.id)).toEqual(["sender", "subject", "body", "link-1", "attachment-0", "attachment-1"]);
  });
  it("cada tipo de zona acepta solo su bandera", () => {
    expect(accepts("sender_spoofing", z("sender"))).toBe(true);
    expect(accepts("sender_spoofing", z("link-1"))).toBe(false);
    expect(accepts("urgency_pretext", z("subject"))).toBe(true);
    expect(accepts("urgency_pretext", z("body"))).toBe(true);
    expect(accepts("hidden_url", z("attachment-0"))).toBe(false);
    expect(flagFor(z("attachment-1")).id).toBe("dangerous_attachment");
  });
});

describe("colocación", () => {
  it("coloca, mueve y quita banderas", () => {
    let p = place({}, "dangerous_attachment", z("attachment-0"))!;
    expect(p).toEqual({ dangerous_attachment: "attachment-0" });
    p = place(p, "dangerous_attachment", z("attachment-1"))!;
    expect(p).toEqual({ dangerous_attachment: "attachment-1" });
    expect(remove(p, "dangerous_attachment")).toEqual({});
  });
  it("rechaza una bandera en una zona que no le corresponde", () => {
    expect(place({}, "hidden_url", z("sender"))).toBeNull();
  });
  it("toggleZone alterna la bandera de esa zona", () => {
    const on = toggleZone({}, z("sender"));
    expect(flagAt(on, z("sender"))).toBe("sender_spoofing");
    expect(toggleZone(on, z("sender"))).toEqual({});
  });
  it("la urgencia puede cambiar de asunto a cuerpo sin duplicarse", () => {
    const p = toggleZone(toggleZone({}, z("subject")), z("body"));
    expect(p).toEqual({ urgency_pretext: "body" });
  });
});

describe("respuesta", () => {
  it("envía solo los tipos de bandera colocados", () => {
    const p = toggleZone(toggleZone({}, z("sender")), z("link-1"));
    expect(toResponse(p)).toEqual({ identified_indicators: ["sender_spoofing", "hidden_url"], action: "report_incident" });
  });
  it("marcar como legítimo no envía indicadores", () => {
    expect(safeResponse()).toEqual({ identified_indicators: [], action: "mark_safe" });
  });
});
