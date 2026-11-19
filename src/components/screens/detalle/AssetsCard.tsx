"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ComparadorInventario, EstadoInventarioBadge, useComparacionInventario } from "./ComparadorInventario";
import { ASSET_TYPE_LABELS } from "@/config/labels";
import { detallesDelActivo } from "@/lib/atributos";
import { formatDateTime } from "@/lib/format";
import type { Asset } from "@/types";

/** Inventario de lo que el dominio deja expuesto: subdominios, certificados, IP y servicios, con sus detalles. */
export function AssetsCard({ assets }: { assets: Asset[] }) {
  const inventario = useComparacionInventario(assets);
  return (
    <Card title="Activos" padded={false} action={`${assets.length} en el inventario`}>
      {assets.length === 0 ? (
        <EmptyState title="Sin activos todavía">Aparecen después del primer escaneo.</EmptyState>
      ) : (
        <>
        <ComparadorInventario control={inventario} />
        <TableWrap>
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Activo</th>
                <th scope="col" className={TH}>Tipo</th>
                <th scope="col" className={TH}>Pertenece a</th>
                <th scope="col" className={TH}>Detalles</th>
                <th scope="col" className={TH}>Visto por última vez</th>
                {inventario.resultado && <th scope="col" className={TH}>Inventario</th>}
              </tr>
            </thead>
            <tbody>
              {inventario.visibles.map((a) => (
                <tr key={a.id} className={TR}>
                  <td className={`${TD} max-w-xs break-all font-mono text-[13px]`}>{a.value}</td>
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
                  {inventario.resultado && <td className={TD}><EstadoInventarioBadge estado={inventario.resultado.estados.get(a.id)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        </>
      )}
    </Card>
  );
}
