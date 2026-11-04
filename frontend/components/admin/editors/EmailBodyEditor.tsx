"use client";

import { Plus } from "lucide-react";
import type { EmailBlock, PhishingContent } from "@/lib/admin";
import { moveItem, removeAt, replaceAt } from "@/lib/lists";
import { ListControls } from "../ListControls";
import { buttonClass, inputClass } from "../ui";

type Email = PhishingContent["email"];

const Err = ({ msg }: { msg?: string }) => (msg ? <p role="alert" className="mt-1 text-sm text-danger">{msg}</p> : null);

/** Párrafos, enlaces y adjuntos del correo. Los errores llegan con la ruta del servidor (content.email.body.N...). */
export function EmailBodyEditor({ email, setEmail, errors }: { email: Email; setEmail: (patch: Partial<Email>) => void; errors: Record<string, string> }) {
  const e = (k: string) => errors[`content.email.${k}`];
  const setBlock = (i: number, b: EmailBlock) => setEmail({ body: replaceAt(email.body, i, b) });

  return (
    <>
      <fieldset>
        <legend className="text-sm font-medium">Cuerpo del correo</legend>
        <div className="mt-2 flex flex-col gap-3">
          {email.body.map((b, i) => (
            <div key={i} className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                {typeof b === "string" ? (
                  <>
                    <textarea rows={2} value={b} onChange={(ev) => setBlock(i, ev.target.value)} aria-label={`Párrafo ${i + 1}`} aria-invalid={!!e(`body.${i}`)} className={inputClass} />
                    <Err msg={e(`body.${i}`)} />
                  </>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <input value={b.link} onChange={(ev) => setBlock(i, { ...b, link: ev.target.value })} placeholder="Texto del enlace" aria-label={`Texto del enlace ${i + 1}`} aria-invalid={!!e(`body.${i}.link`)} className={inputClass} />
                      <Err msg={e(`body.${i}.link`)} />
                    </div>
                    <div>
                      <input value={b.href} onChange={(ev) => setBlock(i, { ...b, href: ev.target.value })} placeholder="Destino real (https://…)" aria-label={`Destino real del enlace ${i + 1}`} aria-invalid={!!e(`body.${i}.href`)} className={`${inputClass} font-mono text-sm`} />
                      <Err msg={e(`body.${i}.href`)} />
                    </div>
                  </div>
                )}
              </div>
              <ListControls label={typeof b === "string" ? `párrafo ${i + 1}` : `enlace ${i + 1}`} index={i} length={email.body.length} onMove={(d) => setEmail({ body: moveItem(email.body, i, d) })} onRemove={() => setEmail({ body: removeAt(email.body, i) })} canRemove={email.body.length > 1} />
            </div>
          ))}
        </div>
        <Err msg={e("body")} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={email.body.length >= 12} onClick={() => setEmail({ body: [...email.body, ""] })}>
            <Plus size={16} aria-hidden="true" />
            Agregar párrafo
          </button>
          <button type="button" className={buttonClass} disabled={email.body.length >= 12} onClick={() => setEmail({ body: [...email.body, { link: "", href: "" }] })}>
            <Plus size={16} aria-hidden="true" />
            Agregar enlace
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Adjuntos</legend>
        <div className="mt-2 flex flex-col gap-2">
          {email.attachments.map((a, i) => (
            <div key={i} className="flex items-start gap-1">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_8rem]">
                <div>
                  <input value={a.name} onChange={(ev) => setEmail({ attachments: replaceAt(email.attachments, i, { ...a, name: ev.target.value }) })} placeholder="Factura.pdf.exe" aria-label={`Nombre del adjunto ${i + 1}`} aria-invalid={!!e(`attachments.${i}.name`)} className={`${inputClass} font-mono text-sm`} />
                  <Err msg={e(`attachments.${i}.name`)} />
                </div>
                <input value={a.size} onChange={(ev) => setEmail({ attachments: replaceAt(email.attachments, i, { ...a, size: ev.target.value }) })} placeholder="214 KB" aria-label={`Tamaño del adjunto ${i + 1}`} className={inputClass} />
              </div>
              <ListControls reorder={false} label={`adjunto ${i + 1}`} index={i} length={email.attachments.length} onMove={() => {}} onRemove={() => setEmail({ attachments: removeAt(email.attachments, i) })} />
            </div>
          ))}
        </div>
        <button type="button" className={`${buttonClass} mt-3`} disabled={email.attachments.length >= 4} onClick={() => setEmail({ attachments: [...email.attachments, { name: "", size: "" }] })}>
          <Plus size={16} aria-hidden="true" />
          Agregar adjunto
        </button>
      </fieldset>
    </>
  );
}
