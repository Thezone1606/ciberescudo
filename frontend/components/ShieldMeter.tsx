"use client";

import { useState } from "react";

const LAYERS = 5;
// Trazo del escudo de lucide (viewBox 24). Cada capa es una copia más pequeña, de afuera hacia adentro.
const SHIELD =
  "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z";
const SCALES = [1, 0.78, 0.58, 0.39, 0.21];
const CENTER = { x: 12, y: 12.4 };

/**
 * Escudo perimetral: un solo escudo de 5 capas concéntricas que se apagan de afuera hacia adentro.
 * La capa perdida se rompe con una animación breve.
 */
export function ShieldMeter({ value }: { value: number }) {
  const intact = Math.max(0, Math.min(LAYERS, Math.round(value / 20)));
  const [prev, setPrev] = useState(intact);
  const [broken, setBroken] = useState<number | null>(null);
  if (intact !== prev) {
    setPrev(intact);
    // La capa que se apaga al bajar de `prev` a `intact` es la número (LAYERS - prev) contando desde afuera.
    setBroken(intact < prev ? LAYERS - prev : null);
  }

  const tone = intact <= 1 ? "text-danger" : intact <= 2 ? "text-warn" : "text-cyan";

  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Escudo: ${intact} de ${LAYERS} capas`}>
      <svg viewBox="0 0 24 24" className="size-9 shrink-0 sm:size-10" aria-hidden="true" fill="none">
        {SCALES.map((s, i) => {
          const lit = i >= LAYERS - intact;
          return (
            <g key={i} transform={`translate(${CENTER.x} ${CENTER.y}) scale(${s}) translate(${-CENTER.x} ${-CENTER.y})`}>
              <path
                d={SHIELD}
                vectorEffect="non-scaling-stroke"
                strokeWidth={1.25}
                strokeLinejoin="round"
                stroke="currentColor"
                fill="currentColor"
                fillOpacity={lit ? 0.07 : 0}
                strokeOpacity={lit ? 1 : 0.7}
                className={`${lit ? tone : "text-muted"} ${broken === i ? "layer-break" : ""} transition-colors duration-200`}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            </g>
          );
        })}
      </svg>
      <span className="font-mono text-sm text-muted" aria-hidden="true">
        {intact}/{LAYERS}
      </span>
    </div>
  );
}
