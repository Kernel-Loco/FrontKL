import { SOLID_TONES, type Tone } from "./tones";

interface ProgressBarProps {
  /** De 0 a 100. */
  value: number;
  tone?: Tone;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, tone = "teal", label, className = "" }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(width) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-lt-raised ${className}`}
    >
      <div className={`h-full rounded-full ${SOLID_TONES[tone].bg}`} style={{ width: `${width}%` }} />
    </div>
  );
}
