"use client";

import { Plus } from "lucide-react";
import type { TerminalFileInput } from "@/lib/admin";
import { removeAt, replaceAt } from "@/lib/lists";
import { ListControls } from "../ListControls";
import { buttonClass, inputClass } from "../ui";

const Err = ({ msg }: { msg?: string }) => (msg ? <p role="alert" className="mt-1 text-sm text-danger">{msg}</p> : null);

/** Archivos del caso. Los de texto se muestran con `cat`/`grep` y reciben su SHA-256 automáticamente; los binarios llevan el hash que tú indiques. */
export function TerminalFilesEditor({ files, onChange, errors }: { files: TerminalFileInput[]; onChange: (f: TerminalFileInput[]) => void; errors: Record<string, string> }) {
  const e = (k: string) => errors[`content.files.${k}`];

  return (
    <fieldset>
      <legend className="text-sm font-medium">Archivos del caso</legend>
      <div className="mt-2 flex flex-col gap-4">
        {files.map((f, i) => {
          const set = (patch: Partial<TerminalFileInput>) => onChange(replaceAt(files, i, { ...f, ...patch }));
          return (
            <div key={i} className="rounded-lg p-3 ring-1 ring-line">
              <div className="flex items-start gap-1">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_9rem_8rem]">
                  <div>
                    <input value={f.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="auth.log" aria-label={`Nombre del archivo ${i + 1}`} aria-invalid={!!e(`${i}.name`)} className={`${inputClass} font-mono text-sm`} />
                    <Err msg={e(`${i}.name`)} />
                  </div>
                  <select value={f.binary ? "bin" : "txt"} onChange={(ev) => set({ binary: ev.target.value === "bin" })} aria-label={`Tipo del archivo ${i + 1}`} className={inputClass}>
                    <option value="txt">Texto</option>
                    <option value="bin">Binario</option>
                  </select>
                  <input value={f.size ?? ""} onChange={(ev) => set({ size: ev.target.value })} placeholder="3 KB" aria-label={`Tamaño del archivo ${i + 1}`} className={inputClass} />
                </div>
                <ListControls reorder={false} label={`archivo ${i + 1}`} index={i} length={files.length} onMove={() => {}} onRemove={() => onChange(removeAt(files, i))} canRemove={files.length > 1} />
              </div>

              <div className="mt-2">
                {f.binary ? (
                  <>
                    <input value={f.sha256 ?? ""} onChange={(ev) => set({ sha256: ev.target.value })} placeholder="SHA-256 (64 caracteres hexadecimales)" aria-label={`SHA-256 del archivo ${i + 1}`} aria-invalid={!!e(`${i}.sha256`)} className={`${inputClass} font-mono text-sm`} />
                    <Err msg={e(`${i}.sha256`)} />
                  </>
                ) : (
                  <>
                    <textarea rows={4} value={f.content ?? ""} onChange={(ev) => set({ content: ev.target.value })} placeholder="Contenido del archivo" aria-label={`Contenido del archivo ${i + 1}`} aria-invalid={!!e(`${i}.content`)} className={`${inputClass} font-mono text-sm`} />
                    <Err msg={e(`${i}.content`)} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Err msg={errors["content.files"]} />
      <button type="button" className={`${buttonClass} mt-3`} disabled={files.length >= 8} onClick={() => onChange([...files, { name: "", binary: false, content: "" }])}>
        <Plus size={16} aria-hidden="true" />
        Agregar archivo
      </button>
    </fieldset>
  );
}
