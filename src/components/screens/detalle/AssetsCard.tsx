import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ASSET_TYPE_LABELS } from "@/config/labels";
import { formatDateTime } from "@/lib/format";
import type { Asset } from "@/types";

/** Inventario de lo que el dominio deja expuesto: subdominios, certificados, IP y servicios. */
export function AssetsCard({ assets }: { assets: Asset[] }) {
  return (
    <Card title="Activos" padded={false} action={`${assets.length} en el inventario`}>
      {assets.length === 0 ? (
        <EmptyState title="Sin activos todavía">Aparecen después del primer escaneo.</EmptyState>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Activo</th>
                <th scope="col" className={TH}>Tipo</th>
                <th scope="col" className={TH}>Pertenece a</th>
                <th scope="col" className={TH}>Visto por última vez</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className={TR}>
                  <td className={`${TD} max-w-xs break-all font-mono text-[13px]`}>{a.value}</td>
                  <td className={TD}>
                    <Badge tone="indigo">{ASSET_TYPE_LABELS[a.type]}</Badge>
                  </td>
                  <td className={`${TD} break-all font-mono text-xs text-lt-muted`}>{a.parent ?? "—"}</td>
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
