import { SEVERITY_LABELS } from "@/config/labels";
import type { Severity } from "@/types";

const STYLES: Record<Severity, { badge: string; dot: string }> = {
  critical: { badge: "bg-red-50 text-red-800 ring-red-200", dot: "bg-red-600" },
  high: { badge: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500" },
  medium: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-400" },
  low: { badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = STYLES[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.badge}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
