import { Card } from "@/components/ui/Card";
import { CATEGORY_LABELS } from "@/config/labels";
import { formatDateTime } from "@/lib/format";
import type { DomainFinding, ScanStatus } from "@/types";

export interface Change {
  domain: string;
  finding: DomainFinding;
}

/** Último escaneo terminado de un dominio. Conteos en `null` cuando el escaneo no los guardó, falló o no está en /scans. */
export interface ScanSummary {
  domain: string;
  finishedAt: string;
  status: ScanStatus | null;
  newFindings: number | null;
  resolvedFindings: number | null;
}

const count = (value: number | null, one: string, many: string) => `${value === null ? "—" : value} ${value === 1 ? one : many}`;

const STATUS_NOTE: Partial<Record<ScanStatus, string>> = {
  partial: "Parcial: solo cuenta lo que el escaneo revisó.",
  failed: "El escaneo falló.",
};

export function RecentChanges({ summaries, changes, more }: { summaries: ScanSummary[]; changes: Change[]; more: number }) {
  return (
    <Card title="Cambios desde el último escaneo">
      <div className="space-y-4">
        {summaries.length === 0 ? (
          <p className="text-sm text-lt-muted">Ningún dominio con score tiene un escaneo terminado.</p>
        ) : (
          <ul className="space-y-2">
            {summaries.map((s) => (
              <li key={s.domain} className="text-sm">
                <span className="font-mono text-lt-text">{s.domain}</span>
                <span className="text-lt-muted"> · {formatDateTime(s.finishedAt)}</span>
                <p className="mt-0.5 text-xs text-lt-muted">
                  <span className="tabular-nums">{count(s.newFindings, "nuevo", "nuevos")}</span> ·{" "}
                  <span className="tabular-nums">{count(s.resolvedFindings, "resuelto", "resueltos")}</span>
                  {s.status && STATUS_NOTE[s.status] && (
                    <span className={s.status === "failed" ? "text-lt-red" : "text-lt-amber"}> · {STATUS_NOTE[s.status]}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
        {changes.length > 0 && (
          <div className="border-t border-lt-border pt-3">
            {/* Abiertos que su último escaneo vio por primera vez: no siempre cuadran con los conteos de arriba. */}
            <p className="text-xs font-medium uppercase tracking-wide text-lt-muted">Nuevos abiertos</p>
            <ul className="divide-y divide-lt-border">
              {changes.map(({ domain, finding }) => (
                <li key={finding.id} className="py-3">
                  <p className="text-sm font-medium text-lt-text">{finding.title}</p>
                  <p className="mt-0.5 text-xs text-lt-muted">
                    <span className="font-mono">{finding.asset === domain ? domain : `${finding.asset} (${domain})`}</span> · {CATEGORY_LABELS[finding.category]}
                  </p>
                </li>
              ))}
              {more > 0 && <li className="pt-3 text-xs text-lt-muted">y {more} más</li>}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
