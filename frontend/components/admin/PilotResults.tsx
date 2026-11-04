import type { PilotReport } from "@/lib/pilot";

const pct = (n: number | null) => (n === null ? "—" : `${n} %`);
const sec = (n: number | null) => (n === null ? "—" : `${n} s`);
const delta = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n} %`);

/** Resultados del piloto. Una cifra sin datos se muestra como «—», nunca como cero. */
export function PilotResults({ r }: { r: PilotReport }) {
  const rows = [
    { label: "Detección de phishing", note: "aciertos en los correos maliciosos", before: pct(r.detection.baselinePct), after: pct(r.detection.posttestPct), change: delta(r.detection.deltaPct), good: (r.detection.deltaPct ?? 0) > 0 },
    { label: "Falsos positivos", note: "errores en los correos legítimos", before: pct(r.falsePositives.baselinePct), after: pct(r.falsePositives.posttestPct), change: "", good: false },
    { label: "Tiempo medio de detección", note: "hasta resolver bien un correo malicioso", before: sec(r.mttd.baselineSeconds), after: sec(r.mttd.posttestSeconds), change: delta(r.mttd.deltaPct), good: (r.mttd.deltaPct ?? 0) < 0 },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="font-semibold">Antes y después</h3>
        <p className="mt-1 text-sm text-muted">
          Solo cuentan las <span className="font-mono text-text">{r.diagnostic.paired}</span> personas que hicieron el diagnóstico inicial y el final.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Resultados del diagnóstico inicial y final</caption>
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="px-2 py-3 sm:px-3 font-medium">Indicador</th>
                <th scope="col" className="px-2 py-3 sm:px-3 text-right font-medium">Inicial</th>
                <th scope="col" className="px-2 py-3 sm:px-3 text-right font-medium">Final</th>
                <th scope="col" className="px-2 py-3 sm:px-3 text-right font-medium">Variación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.label} className="border-t border-line">
                  <th scope="row" className="px-2 py-3 sm:px-3 text-left font-medium">
                    {x.label}
                    <span className="block font-normal text-muted">{x.note}</span>
                  </th>
                  <td className="px-2 py-3 sm:px-3 text-right font-mono">{x.before}</td>
                  <td className="px-2 py-3 sm:px-3 text-right font-mono">{x.after}</td>
                  <td className={`px-2 py-3 text-right font-mono sm:px-3 ${x.good ? "text-ok" : ""}`}>{x.change || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-3">
        <div className="bg-ink p-4">
          <dt className="text-sm text-muted">Adherencia a rachas</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">{pct(r.adherence.ratePct)}</dd>
          <dd className="mt-1 text-sm text-muted">{r.adherence.users} de {r.adherence.total} con {r.adherence.minConsecutiveDays} o más días seguidos.</dd>
        </div>
        <div className="bg-ink p-4">
          <dt className="text-sm text-muted">Usabilidad (SUS)</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">{r.sus.mean === null ? "—" : r.sus.mean}</dd>
          <dd className="mt-1 text-sm text-muted">
            {r.sus.responses} {r.sus.responses === 1 ? "respuesta" : "respuestas"}{r.sus.grade ? `; ${r.sus.grade.toLowerCase()}` : ""}.{" "}
            {r.sus.meetsGoal === null ? `Meta: más de ${r.sus.goal}.` : r.sus.meetsGoal ? `Cumple la meta de ${r.sus.goal}.` : `No llega a la meta de ${r.sus.goal}.`}
          </dd>
        </div>
        <div className="bg-ink p-4">
          <dt className="text-sm text-muted">Grupo</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">{r.participants.total}</dd>
          <dd className="mt-1 text-sm text-muted">{r.participants.technical} {r.participants.technical === 1 ? "técnico" : "técnicos"} y {r.participants.nonTechnical} no {r.participants.nonTechnical === 1 ? "técnico" : "técnicos"} ({pct(r.participants.technicalSharePct)} técnico). Práctica: {r.practice.attempts} intentos.</dd>
        </div>
      </dl>

      {r.notes.length > 0 && (
        <section aria-labelledby="notes-title">
          <h3 id="notes-title" className="font-semibold">Cómo leer estas cifras</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted marker:text-cyan">
            {r.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
