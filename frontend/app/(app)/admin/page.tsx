"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { HeatmapTable } from "@/components/admin/HeatmapTable";
import { KpiStrip } from "@/components/admin/KpiStrip";
import { buttonClass, inputClass } from "@/components/admin/ui";
import type { Filters, Heatmap, Overview } from "@/lib/admin";
import { PERIODS, periodRange, type Period } from "@/lib/dates";
import { apiFetch } from "@/lib/session";
import { useApi } from "@/lib/useApi";

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("30");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [track, setTrack] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);

  const query = new URLSearchParams();
  const { from, to } = periodRange(period);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (departmentId) query.set("departmentId", departmentId);
  if (categoryId) query.set("categoryId", categoryId);
  if (track) query.set("track", track);
  const qs = query.toString() ? `?${query}` : "";

  const filters = useApi<Filters>("/admin/filters");
  const overview = useApi<Overview>(`/admin/metrics/overview${qs}`);
  const heatmap = useApi<Heatmap>(`/admin/metrics/heatmap${qs}`);

  async function download(format: "csv" | "json") {
    setExportError(null);
    const sep = qs ? "&" : "?";
    const res = await apiFetch(`/admin/export${qs}${sep}format=${format}`).catch(() => null);
    if (!res?.ok) return setExportError("No se pudo generar el reporte. Inténtalo de nuevo.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-cumplimiento-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const select = (id: string, label: string, value: string, set: (v: string) => void, options: { value: string; label: string }[]) => (
    <div className="flex min-w-40 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => set(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <form className="flex flex-wrap items-end gap-3" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        {select("period", "Periodo", period, (v) => setPeriod(v as Period), PERIODS.map((p) => ({ value: p.id, label: p.label })))}
        {select("dept", "Departamento", departmentId, setDepartmentId, [{ value: "", label: "Todos" }, ...(filters.data?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))])}
        {select("track", "Ruta", track, setTrack, [{ value: "", label: "Todas" }, { value: "AWARENESS", label: "Corporativa" }, { value: "TECHNICAL", label: "Técnica" }])}
        {select("cat", "Categoría", categoryId, setCategoryId, [{ value: "", label: "Todas" }, ...(filters.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))])}
      </form>

      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="sr-only">
          Indicadores
        </h2>
        {overview.loading && <p role="status" className="text-muted">Cargando indicadores…</p>}
        {overview.error && <p role="alert" className="text-danger">No se pudieron cargar los indicadores.</p>}
        {overview.data && <KpiStrip data={overview.data} />}
      </section>

      <section aria-labelledby="heat-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="heat-title" className="text-lg font-semibold">
              Dónde falla más el personal
            </h2>
            <p className="text-sm text-muted">Tasa de fallo por departamento y categoría. Solo datos colectivos, nunca personas.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={buttonClass} onClick={() => download("csv")}>
              <Download size={16} aria-hidden="true" />
              Exportar CSV
            </button>
            <button type="button" className={buttonClass} onClick={() => download("json")}>
              <Download size={16} aria-hidden="true" />
              Exportar JSON
            </button>
          </div>
        </div>
        {exportError && <p role="alert" className="mb-3 text-sm text-danger">{exportError}</p>}
        {heatmap.loading && <p role="status" className="text-muted">Cargando mapa de calor…</p>}
        {heatmap.error && <p role="alert" className="text-danger">No se pudo cargar el mapa de calor.</p>}
        {heatmap.data && <HeatmapTable data={heatmap.data} />}
      </section>
    </div>
  );
}
