import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  /** Texto pequeño junto al valor, p. ej. "/100". */
  suffix?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "critical";
}

export function KpiCard({ label, value, suffix, hint, icon: Icon, tone = "default" }: KpiCardProps) {
  const iconStyles = tone === "critical" ? "bg-red-50 text-red-600" : "bg-cirdan-50 text-cirdan-700";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyles}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
        {value}
        {suffix && <span className="ml-0.5 text-base font-semibold text-slate-500">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
