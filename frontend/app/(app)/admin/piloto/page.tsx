"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { PilotPhaseControl } from "@/components/admin/PilotPhaseControl";
import { PilotResults } from "@/components/admin/PilotResults";
import { downloadFile } from "@/lib/download";
import type { PilotOverview, PilotReport } from "@/lib/pilot";
import { useApi } from "@/lib/useApi";

function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted">{value} de {total}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full bg-cyan" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PilotPage() {
  const overview = useApi<PilotOverview>("/admin/pilot");
  const report = useApi<PilotReport>("/admin/pilot/report");
  const [exportError, setExportError] = useState(false);

  async function exportAs(format: "csv" | "json") {
    setExportError(false);
    try {
      await downloadFile(`/admin/pilot/report?format=${format}`, `piloto.${format}`);
    } catch {
      setExportError(true);
    }
  }

  const o = overview.data;
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold">Piloto</h1>
        <p className="mt-1 text-muted">Controla la etapa del piloto y consulta los resultados del grupo, sin datos individuales.</p>
      </div>

      {overview.error && <p role="alert" className="text-danger">No se pudo cargar el estado del piloto.</p>}
      {o && (
        <>
          <PilotPhaseControl overview={o} onChanged={overview.reload} />
          <section aria-labelledby="progress-title" className="flex flex-col gap-4">
            <h2 id="progress-title" className="text-lg font-semibold">Avance</h2>
            <Progress label="Diagnóstico inicial completado" value={o.baselineCompleted} total={o.participants} />
            <Progress label="Diagnóstico final completado" value={o.posttestCompleted} total={o.participants} />
            <Progress label="Encuesta de usabilidad contestada" value={o.susResponses} total={o.participants} />
          </section>
        </>
      )}

      <section aria-labelledby="results-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="results-title" className="text-lg font-semibold">Resultados</h2>
          <div className="flex gap-2">
            {(["csv", "json"] as const).map((f) => (
              <button key={f} type="button" onClick={() => exportAs(f)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface px-4 text-sm font-medium ring-1 ring-line transition-colors hover:bg-surface-hi">
                <Download size={16} aria-hidden="true" />
                Exportar {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {exportError && <p role="alert" className="text-sm text-danger">No se pudo exportar el reporte.</p>}
        {report.error && <p role="alert" className="text-danger">No se pudo cargar el reporte.</p>}
        {report.data && <PilotResults r={report.data} />}
      </section>
    </div>
  );
}
