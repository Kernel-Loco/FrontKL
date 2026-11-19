import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ASSET_TYPE_LABELS } from "@/config/labels";
import { hasNewCertificate, isNewAsset, type ScanBase } from "@/lib/activosNuevos";
import { detallesDelActivo } from "@/lib/atributos";
import { formatDateTime } from "@/lib/format";
import type { Asset } from "@/types";

/**
 * Inventario de lo que el dominio deja expuesto: subdominios, certificados, IP y servicios, con sus detalles.
 * Marca 'Nuevo' lo que apareció en el último escaneo terminado y 'Certificado nuevo' el nombre cuyo certificado más
 * reciente se emitió después del escaneo anterior (RC-219). En el primer escaneo no marca nada: todo sería nuevo.
 */
export function AssetsCard({ assets, base }: { assets: Asset[]; base: ScanBase | null }) {
  const marks = base?.last && base.previous ? base : null;
  const fresh = marks ? assets.filter((a) => isNewAsset(a, marks.last)).length : 0;
  const note = base?.firstScan ? " · primer escaneo" : marks && fresh > 0 ? ` · ${fresh} ${fresh === 1 ? "nuevo" : "nuevos"}` : "";
  return (
    <Card title="Activos" padded={false} action={`${assets.length} en el inventario${note}`}>
      {assets.length === 0 ? (
        <EmptyState title="Sin activos todavía">Aparecen después del primer escaneo.</EmptyState>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Activo</th>
                <th scope="col" className={TH}>Tipo</th>
                <th scope="col" className={TH}>Pertenece a</th>
                <th scope="col" className={TH}>Detalles</th>
                <th scope="col" className={TH}>Visto por última vez</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className={TR}>
                  <td className={`${TD} max-w-xs break-all font-mono text-[13px]`}>
                    {a.value}
                    {marks && (isNewAsset(a, marks.last) || hasNewCertificate(a, marks)) && (
                      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle font-sans">
                        {isNewAsset(a, marks.last) && <Badge tone="green">Nuevo</Badge>}
                        {hasNewCertificate(a, marks) && <Badge tone="teal">Certificado nuevo</Badge>}
                      </span>
                    )}
                  </td>
                  <td className={TD}>
                    <Badge tone="indigo">{ASSET_TYPE_LABELS[a.type]}</Badge>
                  </td>
                  <td className={`${TD} break-all font-mono text-xs text-lt-muted`}>{a.parent ?? "—"}</td>
                  <td className={`${TD} max-w-xs text-xs`}>
                    {detallesDelActivo(a).length === 0 ? (
                      <span className="text-lt-faint">—</span>
                    ) : (
                      <dl className="space-y-0.5">
                        {detallesDelActivo(a).map((d) => (
                          <div key={d.etiqueta} className="flex gap-1.5">
                            <dt className="shrink-0 text-lt-faint">{d.etiqueta}:</dt>
                            <dd className="min-w-0 break-words text-lt-text">{d.valor}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDateTime(a.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  );
}
