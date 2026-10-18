import { SOLID_TONES, type Tone } from "@/components/ui/tones";

interface KpiTileProps {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}

export function KpiTile({ label, value, tone, hint }: KpiTileProps) {
  return (
    <div className="rounded-xl border border-lt-border bg-lt-surface p-5">
      <p className="text-sm text-lt-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${tone ? SOLID_TONES[tone].text : "text-lt-text"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-lt-faint">{hint}</p>}
    </div>
  );
}
