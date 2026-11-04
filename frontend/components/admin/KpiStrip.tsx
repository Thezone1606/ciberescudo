import type { Overview } from "@/lib/admin";

const pct = (n: number | null) => (n === null ? "—" : `${n} %`);

/** Indicadores del programa en una sola franja: cada uno dice qué mide y sobre cuántas personas. */
export function KpiStrip({ data }: { data: Overview }) {
  const items = [
    {
      label: "Adopción semanal",
      value: pct(data.adoption.rate),
      note: `${data.adoption.activeLast7Days} de ${data.players} colaboradores resolvieron al menos un reto en 7 días.`,
    },
    {
      label: "Racha vigente de 7 días o más",
      value: String(data.streakAdherence.users),
      note: data.players ? `Colaboradores con constancia diaria (${pct(data.streakAdherence.rate)} de ${data.players}).` : "Sin colaboradores en este filtro.",
    },
    {
      label: "Tiempo medio de detección",
      value: data.mttdSeconds === null ? "—" : `${data.mttdSeconds} s`,
      note: "Promedio hasta resolver bien un correo de phishing.",
    },
    {
      label: "Tasa de fallo",
      value: pct(data.failureRate),
      note: `${data.attempts} intentos en el periodo${data.averageShield === null ? "" : `; escudo promedio ${data.averageShield} de 5 capas`}.`,
    },
  ];

  return (
    <dl className="grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-ink p-4">
          <dt className="text-sm text-muted">{i.label}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">{i.value}</dd>
          <dd className="mt-1 text-sm text-muted">{i.note}</dd>
        </div>
      ))}
    </dl>
  );
}
