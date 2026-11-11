import { BAND_LABELS, SEVERITY_LABELS } from "@/config/labels";
import { gradeText, PARTIAL_GRADE_NOTE } from "@/lib/riesgo";
import type { Band, Grade, Severity } from "@/types";
import { BAND_TONE, BADGE_TONES, SEVERITY_BADGE, SOLID_TONES, type Tone } from "./tones";

const BADGE_BASE = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold";

interface BadgeProps {
  tone?: Tone;
  /** Punto de color antes del texto, como en los estados. */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = "gray", dot = false, className = "", children }: BadgeProps) {
  return (
    <span
      className={`${BADGE_BASE} ${BADGE_TONES[tone]} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${SOLID_TONES[tone].bg}`} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`${BADGE_BASE} ${SEVERITY_BADGE[severity]}`}>{SEVERITY_LABELS[severity]}</span>;
}

/**
 * Letra del score (#114). La da la API; el color sale de la banda, que también da la API. Con cobertura parcial
 * lleva el mismo aviso que el score.
 */
export function GradeBadge({ grade, band, partial = false }: { grade: Grade; band: Band; partial?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={partial ? PARTIAL_GRADE_NOTE : undefined}>
      <Badge tone={BAND_TONE[band]} className="min-w-6 justify-center font-bold tabular-nums">
        <span aria-hidden="true">{grade}</span>
        <span className="sr-only">{gradeText(grade, partial)}</span>
      </Badge>
      {partial && (
        <span aria-hidden="true" className="rounded-sm border border-lt-amber/30 bg-lt-amber/10 px-1.5 py-0.5 text-[11px] text-lt-amber">
          Parcial
        </span>
      )}
    </span>
  );
}

export function BandBadge({ band, prefix = "" }: { band: Band; prefix?: string }) {
  return (
    <Badge tone={BAND_TONE[band]}>
      {prefix}
      {BAND_LABELS[band]}
    </Badge>
  );
}
