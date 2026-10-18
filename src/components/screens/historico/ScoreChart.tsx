import { formatShortDate } from "@/lib/format";
import type { ScoreHistoryPoint } from "@/types";

const W = 1000;
const H = 300;
const PAD = { top: 16, right: 24, bottom: 36, left: 40 };

/** Línea del riesgo global en el tiempo (SVG, sin librerías). */
export function ScoreChart({ points }: { points: ScoreHistoryPoint[] }) {
  const scores = points.map((p) => p.score);
  const min = Math.max(0, Math.floor((Math.min(...scores) - 5) / 10) * 10);
  const max = Math.min(100, Math.ceil((Math.max(...scores) + 5) / 10) * 10);
  const step = max - min > 40 ? 20 : 10;
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min || 1)) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const last = points.length - 1;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="grafica-titulo grafica-desc">
        <title id="grafica-titulo">Riesgo global en el tiempo</title>
        <desc id="grafica-desc">{points.map((p) => `${formatShortDate(p.computed_at)}: ${p.score}`).join("; ")}</desc>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-white/8" />
            <text x={PAD.left - 12} y={y(t)} dy="0.35em" textAnchor="end" className="fill-lt-muted font-mono text-[12px]">
              {t}
            </text>
          </g>
        ))}
        <path d={path} fill="none" strokeWidth="2.5" strokeLinejoin="round" className="stroke-lt-teal" />
        {points.map((p, i) => (
          <g key={p.score_id}>
            <circle cx={x(i)} cy={y(p.score)} r={i === last ? 7 : 4.5} className={i === last ? "fill-lt-orange" : "fill-lt-teal"} />
            <text
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              className={`text-[12px] ${i === last ? "fill-white font-semibold" : "fill-lt-muted"}`}
            >
              {formatShortDate(p.computed_at)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
