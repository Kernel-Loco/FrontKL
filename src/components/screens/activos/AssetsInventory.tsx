"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActionButton, ActionLink, TEXT_LINK } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { INPUT, SELECT } from "@/components/ui/Field";
import { ApiExport } from "@/components/screens/shared/ApiExport";
import { ASSET_TYPE_LABELS } from "@/config/labels";
import {
  conteo,
  consultaActivos,
  paginas,
  POR_PAGINA,
  TIPOS_ACTIVO,
  urlFiltros,
  type FiltrosActivos,
  type TipoActivoFiltro,
} from "@/lib/filtrosActivos";
import { cantidad, formatDateTime } from "@/lib/format";
import { conVista, type Vista } from "@/lib/arbolActivos";
import { AssetsTree } from "./AssetsTree";
import { downloadAssets } from "@/services/exportService";
import type { OrganizationAssets } from "@/types";

const hayFiltros = (f: FiltrosActivos) => Boolean(f.dominio || f.tipo || f.texto);

/**
 * Tabla del inventario de la organización (RC-231). Dominio, tipo y texto se aplican juntos con el botón Buscar (o con
 * Enter), no al cambiar un select: así el teclado recorre las opciones sin navegar y el foco no se pierde (WCAG 3.2.2).
 * Cada búsqueda vuelve a la página 1 y la página del servidor pide a la API solo esa página. El componente no se vuelve
 * a montar al navegar: los campos se igualan a los filtros de la URL cuando estos cambian (atrás, Limpiar o una página).
 * La exportación trae todas las páginas con los filtros aplicados, de los dominios con autorización vigente.
 */
export function AssetsInventory({
  filtros,
  dominios,
  conCarta,
  activos,
  canOpenDetail,
  vista = "lista",
}: {
  filtros: FiltrosActivos;
  dominios: string[];
  /** Los fqdn con autorización vigente, los únicos que exporta la API. */
  conCarta: string[];
  activos: OrganizationAssets;
  canOpenDetail: boolean;
  /** En el árbol (RC-248) `activos` trae todos los del filtro hasta MAX_ARBOL, sin paginar. */
  vista?: Vista;
}) {
  const ids = { dominio: useId(), tipo: useId(), texto: useId() };
  const router = useRouter();
  const pathname = usePathname();
  const [dominio, setDominio] = useState(filtros.dominio);
  const [tipo, setTipo] = useState(filtros.tipo);
  const [texto, setTexto] = useState(filtros.texto);
  // Los campos siguen a la URL cuando cambian los filtros aplicados (estado derivado de props, como pide React).
  const clave = urlFiltros({ ...filtros, pagina: 1 });
  const [claveVista, setClaveVista] = useState(clave);
  if (clave !== claveVista) {
    setClaveVista(clave);
    setDominio(filtros.dominio);
    setTipo(filtros.tipo);
    setTexto(filtros.texto);
  }

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    router.push(`${pathname}${conVista(urlFiltros({ dominio, tipo, texto: texto.trim().slice(0, 200), pagina: 1 }), vista)}`);
  };

  const total = activos.total;
  const ultima = paginas(total);
  const enlacePagina = (pagina: number) => `${pathname}${urlFiltros({ ...filtros, pagina })}`;
  const fueraDeRango = activos.items.length === 0 && total > 0;
  const sinCarta = filtros.dominio ? !conCarta.includes(filtros.dominio) : conCarta.length === 0;

  return (
    <Card padded={false}>
      <form onSubmit={buscar} role="search" aria-label="Filtrar activos"
        className="grid gap-3 border-b border-lt-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto]">
        <div>
          <label htmlFor={ids.dominio} className="mb-1.5 block text-xs font-medium text-lt-muted">Dominio</label>
          <select id={ids.dominio} value={dominio} onChange={(e) => setDominio(e.target.value)}
            className={`${SELECT} font-mono text-[13px]`}>
            <option value="">Todos</option>
            {dominios.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.tipo} className="mb-1.5 block text-xs font-medium text-lt-muted">Tipo</label>
          <select id={ids.tipo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoActivoFiltro | "")}
            className={SELECT}>
            <option value="">Todos</option>
            {TIPOS_ACTIVO.map((t) => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.texto} className="mb-1.5 block text-xs font-medium text-lt-muted">Buscar</label>
          <input id={ids.texto} type="search" value={texto} maxLength={200} onChange={(e) => setTexto(e.target.value)}
            placeholder="Subdominio, IP, correo…" className={INPUT} />
        </div>
        <div className="flex items-end gap-2">
          <ActionButton type="submit" variant="secondary">Buscar</ActionButton>
          {hayFiltros(filtros) && <ActionLink href={`${pathname}${conVista("", vista)}`} variant="ghost">Limpiar</ActionLink>}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <p className="text-xs text-lt-muted" aria-live="polite">
          {conteo(total, activos.offset, activos.items.length)}
          {hayFiltros(filtros) && " con estos filtros"}
        </p>
        <div className="flex flex-col items-end gap-1">
          <ApiExport filename={filtros.dominio ? `${filtros.dominio}-activos` : "activos"} label="Exportar activos"
            formats={["csv"]} disabled={total === 0 || sinCarta}
            download={(_, signal) => downloadAssets(consultaActivos(filtros, false), signal)} />
          <p className="text-[11px] text-lt-faint">
            {sinCarta
              ? filtros.dominio
                ? "Este dominio no tiene autorización vigente: no se puede exportar."
                : "Ningún dominio tiene autorización vigente: no hay nada que exportar."
              : "Todas las páginas con estos filtros, solo de dominios con autorización vigente."}
          </p>
        </div>
      </div>

      {activos.items.length === 0 ? (
        fueraDeRango ? (
          <EmptyState title="Esta página no existe">
            Los filtros dan {ultima} {ultima === 1 ? "página" : "páginas"}.{" "}
            <Link href={enlacePagina(1)} className={TEXT_LINK}>Ir a la primera</Link>
          </EmptyState>
        ) : hayFiltros(filtros) ? (
          <EmptyState title="Ningún activo coincide">Prueba con otra búsqueda o quita los filtros.</EmptyState>
        ) : (
          <EmptyState title="Sin activos todavía">Aparecen después del primer escaneo de un dominio autorizado.</EmptyState>
        )
      ) : vista === "arbol" ? (
        <>
          {total > activos.items.length && (
            <p className="px-5 pb-3 text-xs text-lt-amber" role="status">
              El árbol muestra {activos.items.length} de {cantidad(total, "activo")}. Filtra por dominio o tipo para ver el resto.
            </p>
          )}
          <AssetsTree activos={activos.items} canOpenDetail={canOpenDetail} />
        </>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[820px]">
            <caption className="sr-only">Activos de la organización</caption>
            <thead>
              <tr>
                <th scope="col" className={TH}>Activo</th>
                <th scope="col" className={TH}>Tipo</th>
                <th scope="col" className={TH}>Dominio</th>
                <th scope="col" className={TH}>Pertenece a</th>
                <th scope="col" className={TH}>Visto por primera vez</th>
                <th scope="col" className={TH}>Visto por última vez</th>
              </tr>
            </thead>
            <tbody>
              {activos.items.map((a) => (
                <tr key={a.id} className={TR}>
                  <td className={`${TD} max-w-xs break-all font-mono text-[13px]`}>{a.value}</td>
                  <td className={TD}><Badge tone="indigo">{ASSET_TYPE_LABELS[a.type] ?? a.type}</Badge></td>
                  <td className={`${TD} break-all font-mono text-xs`}>
                    {canOpenDetail
                      ? <Link href={`/dashboard/dominios/${encodeURIComponent(a.domain)}`} className={TEXT_LINK}>{a.domain}</Link>
                      : a.domain}
                  </td>
                  <td className={`${TD} break-all font-mono text-xs text-lt-muted`}>{a.parent ?? "—"}</td>
                  <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDateTime(a.first_seen_at)}</td>
                  <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDateTime(a.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {vista === "lista" && total > POR_PAGINA && !fueraDeRango && (
        <nav aria-label="Páginas de activos" className="flex items-center justify-between gap-3 border-t border-lt-border px-5 py-3">
          {filtros.pagina > 1
            ? <ActionLink href={enlacePagina(Math.min(filtros.pagina - 1, ultima))} size="sm"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Anterior</ActionLink>
            : <span />}
          <span className="text-xs text-lt-muted">Página {filtros.pagina} de {ultima}</span>
          {filtros.pagina < ultima
            ? <ActionLink href={enlacePagina(filtros.pagina + 1)} size="sm">Siguiente<ChevronRight aria-hidden="true" className="h-4 w-4" /></ActionLink>
            : <span />}
        </nav>
      )}
    </Card>
  );
}
