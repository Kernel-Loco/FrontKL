import Link from "next/link";
import { CheckCircle2, Timer } from "lucide-react";
import { remediationTexts, STATUS_FILTERS } from "@/lib/triage";
import type { DomainRemediation, FindingStatusFilter } from "@/types";
import { tx } from "@/i18n/tx";

/**
 * Tiempo medio de remediación y porcentaje de hallazgos cerrados del dominio (#80b, RC-172), con las pestañas de
 * estado de Hallazgos. Las métricas salen de GET /domains/{fqdn}/remediation (RC-133); sin ellas solo van las pestañas.
 */
export function RemediationSummary({
  domain,
  metrics,
  status,
}: {
  domain: string;
  metrics: DomainRemediation | null;
  status: FindingStatusFilter;
}) {
  const texts = metrics ? remediationTexts(metrics) : null;
  const href = (value: FindingStatusFilter) => {
    const params = new URLSearchParams({ dominio: domain });
    if (value !== "open") params.set("estado", value);
    return `/dashboard/hallazgos?${params}`;
  };

  return (
    <div className="space-y-4">
      {texts && metrics && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl bg-lt-surface p-4">
            <Timer aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-lt-teal" />
            <div>
              <p className="text-xs text-lt-muted">{tx("Tiempo medio de remediación")}</p>
              <p className="text-xl font-semibold text-lt-text">{texts.mttr}</p>
              <p className="text-xs text-lt-faint">{texts.mttrHint}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-lt-surface p-4">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-lt-green" />
            <div>
              <p className="text-xs text-lt-muted">{tx("Hallazgos cerrados")}</p>
              <p className="text-xl font-semibold text-lt-text">{texts.closed}</p>
              <p className="text-xs text-lt-faint">{texts.closedHint}</p>
            </div>
          </div>
        </div>
      )}
      <nav aria-label={tx("Estado de los hallazgos")} className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = f.value === status;
          const count = metrics && f.value !== "all" ? metrics.by_status[f.value] : metrics && f.value === "all" ? metrics.total : null;
          return (
            <Link
              key={f.value}
              href={href(f.value)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                active ? "border-lt-indigo bg-lt-indigo/15 text-lt-indigo-soft" : "border-lt-border bg-lt-raised text-lt-muted hover:text-lt-text"
              }`}
            >
              {f.label}
              {count !== null && <span className="rounded bg-lt-surface px-1.5 tabular-nums text-[11px]">{count}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
