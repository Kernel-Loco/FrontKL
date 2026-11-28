import { Card } from "@/components/ui/Card";
import { SourceAttribution } from "@/components/screens/shared/SourceAttribution";
import { CATEGORY_LABELS } from "@/config/labels";
import { newAssetsText, type NewAssetCounts } from "@/lib/activosNuevos";
import { atribucionesDe } from "@/lib/atribucion";
import { formatDateTime } from "@/lib/format";
import type { DomainFinding, ScanStatus } from "@/types";
import { tx, localized } from "@/i18n/tx";

export interface Change {
  domain: string;
  finding: DomainFinding;
}

/**
 * Último escaneo terminado de un dominio. Conteos en `null` cuando el escaneo no los guardó, falló o no está en /scans.
 * `finishedAt` en `null` cuando el dominio tiene score pero no hay fecha de escaneo.
 */
export interface ScanSummary {
  domain: string;
  finishedAt: string | null;
  status: ScanStatus | null;
  newFindings: number | null;
  resolvedFindings: number | null;
  /** Subdominios, IP, puertos y certificados nuevos del último escaneo (RC-219). `null` si no se pueden contar. */
  newAssets: NewAssetCounts | null;
  /** El último escaneo es el primero del dominio: no cuenta todo como nuevo. */
  firstScan: boolean;
}

const count = (value: number | null, one: string, many: string) => `${value === null ? "—" : value} ${tx(value === 1 ? one : many)}`;

const STATUS_NOTE: Partial<Record<ScanStatus, string>> = localized({
  partial: "Parcial: solo cuenta lo que el escaneo revisó.",
  failed: "El escaneo falló.",
});

export function RecentChanges({ summaries, changes, more }: { summaries: ScanSummary[]; changes: Change[]; more: number }) {
  return (
    <Card title={tx("Cambios desde el último escaneo")}>
      <div className="space-y-4">
        {summaries.length === 0 ? (
          <p className="text-sm text-lt-muted">{tx("Ningún dominio activo tiene un escaneo terminado.")}</p>
        ) : (
          <ul className="space-y-2">
            {summaries.map((s) => (
              <li key={s.domain} className="text-sm">
                <span className="tabular-nums text-lt-text">{s.domain}</span>
                <span className="text-lt-muted"> · {s.finishedAt ? formatDateTime(s.finishedAt) : tx("sin fecha de escaneo")}</span>
                <p className="mt-0.5 text-xs text-lt-muted">
                  <span className="tabular-nums">{count(s.newFindings, "nuevo", "nuevos")}</span> ·{" "}
                  <span className="tabular-nums">{count(s.resolvedFindings, "resuelto", "resueltos")}</span>
                  {s.status && STATUS_NOTE[s.status] && (
                    <span className={s.status === "failed" ? "text-lt-red" : "text-lt-amber"}> · {STATUS_NOTE[s.status]}</span>
                  )}
                </p>
                {/* Los desaparecidos no se listan, igual que los resueltos. */}
                <p className="mt-0.5 text-xs text-lt-muted">
                  {s.firstScan ? (
                    tx("Activos: primer escaneo")
                  ) : (
                    <>
                      {tx("Activos nuevos:")}{" "}<span className="tabular-nums">{s.newAssets ? newAssetsText(s.newAssets) : "—"}</span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
        {changes.length > 0 && (
          <div className="border-t border-lt-border pt-3">
            {/* Abiertos que su último escaneo vio por primera vez: no siempre cuadran con los conteos de arriba. */}
            <p className="text-xs font-medium text-lt-muted">{tx("Nuevos abiertos")}</p>
            <ul className="divide-y divide-lt-border">
              {changes.map(({ domain, finding }) => (
                <li key={finding.id} className="py-3">
                  <p className="text-sm font-medium text-lt-text">{finding.title}</p>
                  <p className="mt-0.5 text-xs text-lt-muted">
                    <span className="tabular-nums">{finding.asset === domain ? domain : `${finding.asset} (${domain})`}</span> · {CATEGORY_LABELS[finding.category]}
                  </p>
                </li>
              ))}
              {more > 0 && <li className="pt-3 text-xs text-lt-muted">{tx("y {0} más", more)}</li>}
            </ul>
            {atribucionesDe(changes.map((c) => c.finding)).map((a) => (
              <SourceAttribution key={a.url} atribucion={a} className="pt-2" />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
