import Link from "next/link";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { Badge, BandBadge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BAND_TONE } from "@/components/ui/tones";
import { formatDateTime } from "@/lib/format";
import type { Domain } from "@/types";
import { domainState } from "../shared/domainState";

export function DomainsRiskTable({ domains, canOpenDetail }: { domains: Domain[]; canOpenDetail: boolean }) {
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
                const state = domainState(d);
                return (
                  <tr key={d.id} className={TR}>
                    <td className={`${TD} font-mono text-[13px]`}>{d.fqdn}</td>
                    <td className={TD}>
                      {d.score !== null && d.band ? (
                        <div className="flex items-center gap-3">
                          <span className="w-7 font-semibold tabular-nums">{d.score}</span>
                          <ProgressBar value={d.score} tone={BAND_TONE[d.band]} className="w-28" />
                        </div>
                      ) : (
                        <span className="text-lt-faint">—</span>
                      )}
                    </td>
                    <td className={TD}>{d.band ? <BandBadge band={d.band} /> : <Badge tone={state.tone}>{state.label}</Badge>}</td>
                    <td className={`${TD} text-lt-muted`}>{d.last_scan_at ? formatDateTime(d.last_scan_at) : "—"}</td>
                    <td className={`${TD} text-right`}>
                      {canOpenDetail && d.score !== null ? (
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
