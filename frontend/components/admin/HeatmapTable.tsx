import type { HeatCell, Heatmap } from "@/lib/admin";

const STYLE: Record<HeatCell["level"], string> = {
  green: "bg-ok/20 text-text",
  yellow: "bg-warn/20 text-text",
  red: "bg-danger/25 text-text",
  insufficient: "bg-surface text-muted",
};
const LABEL: Record<HeatCell["level"], string> = {
  green: "riesgo bajo",
  yellow: "riesgo medio",
  red: "riesgo alto",
  insufficient: "sin datos suficientes",
};

/** Mapa de calor departamento × categoría. El color nunca va solo: cada celda dice su tasa y sus intentos. */
export function HeatmapTable({ data }: { data: Heatmap }) {
  const cell = (d: string, c: string) => data.cells.find((x) => x.departmentId === d && x.categoryId === c);
  const empty = data.cells.every((c) => c.attempts === 0);

  return (
    <div>
      {empty && <p className="mb-4 rounded-lg bg-surface p-4 text-sm ring-1 ring-line">No hay intentos con estos filtros todavía.</p>}

      <div className="overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <caption className="sr-only">Tasa de fallo por departamento y categoría</caption>
          <thead>
            <tr className="bg-surface text-left">
              <th scope="col" className="sticky left-0 z-10 w-40 bg-surface px-3 py-3 font-medium">
                Departamento
              </th>
              {data.categories.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-3 text-center font-medium">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.departments.map((d) => (
              <tr key={d.id} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-ink px-3 py-3 text-left font-medium">
                  {d.name}
                </th>
                {data.categories.map((c) => {
                  const x = cell(d.id, c.id);
                  const level = x?.level ?? "insufficient";
                  return (
                    <td key={c.id} className={`px-3 py-3 text-center ${STYLE[level]}`}>
                      <span className="block font-mono text-base font-semibold">{x?.rate === null || x === undefined ? "—" : `${x.rate} %`}</span>
                      <span className="block text-xs text-muted">{x?.attempts ?? 0} intentos</span>
                      <span className="sr-only">{LABEL[level]}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted" aria-label="Leyenda">
        <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-ok/40" aria-hidden="true" />Menos de {data.thresholds.green} % de fallo</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-warn/40" aria-hidden="true" />{data.thresholds.green} a {data.thresholds.yellow} %</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-danger/50" aria-hidden="true" />Más de {data.thresholds.yellow} %</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-surface ring-1 ring-line" aria-hidden="true" />Menos de {data.minAttempts} intentos: no se calcula, para no señalar a personas</li>
      </ul>
    </div>
  );
}
