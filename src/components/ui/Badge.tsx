import { BAND_LABELS, SEVERITY_LABELS } from "@/config/labels";
import type { Band, Severity } from "@/types";
import { BAND_TONE, BADGE_TONES, SEVERITY_TONE, SOLID_TONES, type Tone } from "./tones";

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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${SOLID_TONES[tone].bg}`} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABELS[severity]}</Badge>;
}

export function BandBadge({ band, prefix = "" }: { band: Band; prefix?: string }) {
  return (
    <Badge tone={BAND_TONE[band]}>
      {prefix}
      {BAND_LABELS[band]}
    </Badge>
  );
}
