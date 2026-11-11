import Link from "next/link";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { Badge, BandBadge, GradeBadge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BAND_TONE } from "@/components/ui/tones";
import { formatDateTime } from "@/lib/format";
import type { Domain, Scan } from "@/types";
import { domainState, failedScanAt, hasResults } from "../shared/domainState";

/**
 * `lastScans`: último escaneo terminado de cada dominio entre los 50 de /scans, para marcar uno que falló.
 * `partialDomains`: dominios cuyo score salió con cobertura parcial; su letra lleva el mismo aviso.
 */
export function DomainsRiskTable({
  domains,
  lastScans,
  partialDomains,
  canOpenDetail,
}: {
  domains: Domain[];
  lastScans: Map<string, Scan>;
  partialDomains: Set<string>;
  canOpenDetail: boolean;
}) {
  return (
    <Card title="Dominios" padded={false}>
      {domains.length === 0 ? (
        <EmptyState title="Aún no hay dominios">Un Administrador debe registrar el primer dominio con su autorización firmada.</EmptyState>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Dominio</th>
                <th scope="col" className={TH}>Riesgo global</th>
                <th scope="col" className={TH}>Nivel</th>
                <th scope="col" className={TH}>Último escaneo</th>
                <th scope="col" className={TH}><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => {
                // Sin score, el estado dice por qué; si ya está autorizado, falta que un escaneo calcule el riesgo.
                const state = domainState(d);
                const failedAt = failedScanAt(d, lastScans.get(d.fqdn));
                return (
                  <tr key={d.id} className={TR}>
                    <td className={`${TD} font-mono text-[13px]`}>{d.fqdn}</td>
                    <td className={TD}>
                      {d.score !== null && d.band ? (
                        <div className="flex items-center gap-3">
                          <span className="w-7 font-semibold tabular-nums">{d.score}</span>
                          <ProgressBar value={d.score} tone={BAND_TONE[d.band]} className="w-28" />
                          {d.grade && <GradeBadge grade={d.grade} band={d.band} partial={partialDomains.has(d.fqdn)} />}
                        </div>
                      ) : (
                        <span className="text-lt-faint">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      {d.band ? (
                        <BandBadge band={d.band} />
                      ) : state.label === "Autorizado" ? (
                        <Badge tone="gray">Sin calcular</Badge>
                      ) : (
                        <Badge tone={state.tone}>{state.label}</Badge>
                      )}
                    </td>
                    <td className={`${TD} text-lt-muted`}>
                      {failedAt ? `${formatDateTime(failedAt)}, falló` : d.last_scan_at ? formatDateTime(d.last_scan_at) : "—"}
                    </td>
                    <td className={`${TD} text-right`}>
                      {canOpenDetail && hasResults(d) ? (
                        <Link href={`/dashboard/dominios/${d.fqdn}`} className={`${TEXT_LINK} text-sm`}>
                          Ver detalle<span className="sr-only"> de {d.fqdn}</span>
                        </Link>
                      ) : (
                        <span className="text-lt-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
