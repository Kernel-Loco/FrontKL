import { BAND_LABELS } from "@/config/labels";
import type { Band } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { BAND_TONE, SOLID_TONES } from "@/components/ui/tones";

interface RiskGaugeProps {
  score: number;
  band: Band;
  /** Diferencia contra el escaneo anterior; `null` si es el primero. */
  delta: number | null;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anillo de 0 a 100 con el score global del dominio. */
export function RiskGauge({ score, band, delta }: RiskGaugeProps) {
  const tone = BAND_TONE[band];
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`Riesgo global ${score} de 100, ${BAND_LABELS[band].toLowerCase()}`}>
          <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="9" className="stroke-white/8" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
            className={SOLID_TONES[tone].stroke}
          />
        </svg>
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-white">{score}</span>
          <span className="text-xs text-lt-muted">de 100</span>
        </div>
      </div>
      <Badge tone={tone} className="mt-4 px-3 py-1 uppercase tracking-wider">
        Riesgo {BAND_LABELS[band]}
      </Badge>
      {delta !== null && (
        <p className="mt-2 text-xs text-lt-muted">
          {delta === 0 ? "Igual que el escaneo anterior" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} vs. escaneo anterior`}
        </p>
      )}
    </div>
  );
}
