"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TEXT_LINK } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { ASSET_TYPE_LABELS } from "@/config/labels";
import { abreAbierto, armarArbol, textoSuelto, type NodoActivo, type RamaDominio } from "@/lib/arbolActivos";
import type { OrganizationAsset } from "@/types";

const etiqueta = (tipo: string) => ASSET_TYPE_LABELS[tipo as keyof typeof ASSET_TYPE_LABELS] ?? tipo;
const cuantos = (n: number) => `${n} ${n === 1 ? "activo" : "activos"} debajo`;

/**
 * Vista en árbol de 'Activos' (RC-248): cada dominio con sus subdominios, IP y servicios debajo, armado en
 * src/lib/arbolActivos.ts con los mismos filtros de la lista. Cada nodo es un botón de abrir y cerrar (patrón
 * disclosure, aria-expanded y aria-controls) y sus hijos se montan solo al abrirlo: con muchos activos el árbol abre
 * cerrado y no pinta miles de filas de golpe. Con pocos abre todo abierto.
 */
export function AssetsTree({ activos, canOpenDetail }: { activos: OrganizationAsset[]; canOpenDetail: boolean }) {
  const ramas = useMemo(() => armarArbol(activos), [activos]);
  const abierto = abreAbierto(activos.length);
  return (
    <ul aria-label="Árbol de activos" className="space-y-1 px-3 pb-5">
      {ramas.map((r) => <Dominio key={r.dominio} rama={r} abiertoInicial={abierto} canOpenDetail={canOpenDetail} />)}
    </ul>
  );
}

function Dominio({ rama, abiertoInicial, canOpenDetail }: {
  rama: RamaDominio<OrganizationAsset>;
  abiertoInicial: boolean;
  canOpenDetail: boolean;
}) {
  const nombre = canOpenDetail
    ? <Link href={`/dashboard/dominios/${encodeURIComponent(rama.dominio)}`} className={TEXT_LINK}>{rama.dominio}</Link>
    : rama.dominio;
  return (
    <Fila hijos={rama.hijos} descendientes={rama.descendientes} abiertoInicial={abiertoInicial} nombre={rama.dominio}
      contenido={<>
        <span className="break-all font-mono text-[13px] font-semibold text-lt-text">{nombre}</span>
        <Badge tone="indigo">Dominio</Badge>
      </>} />
  );
}

function Nodo({ nodo, abiertoInicial }: { nodo: NodoActivo<OrganizationAsset>; abiertoInicial: boolean }) {
  const { activo, suelto } = nodo;
  return (
    <Fila hijos={nodo.hijos} descendientes={nodo.descendientes} abiertoInicial={abiertoInicial} nombre={activo.value}
      contenido={<>
        <span className="break-all font-mono text-[13px] text-lt-text">{activo.value}</span>
        <Badge tone="gray">{etiqueta(activo.type)}</Badge>
        {suelto && (
          <span title={textoSuelto(suelto, activo.parent)}>
            <Badge tone="amber">Suelto</Badge>
            <span className="sr-only">{textoSuelto(suelto, activo.parent)}</span>
          </span>
        )}
      </>} />
  );
}

function Fila({ hijos, descendientes, abiertoInicial, nombre, contenido }: {
  hijos: NodoActivo<OrganizationAsset>[];
  descendientes: number;
  abiertoInicial: boolean;
  /** Para el nombre accesible del botón. */
  nombre: string;
  contenido: ReactNode;
}) {
  const id = useId();
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <li>
      <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md px-2 py-1 hover:bg-lt-raised">
        {hijos.length > 0 ? (
          <button type="button" aria-expanded={abierto} aria-controls={abierto ? id : undefined}onClick={() => setAbierto(!abierto)}
            aria-label={`${abierto ? "Cerrar" : "Abrir"} ${nombre}`}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lt-muted hover:bg-lt-border hover:text-lt-text">
            <ChevronRight aria-hidden="true" className={`h-4 w-4 transition-transform ${abierto ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span aria-hidden="true" className="inline-block h-7 w-7 shrink-0" />
        )}
        {contenido}
        {descendientes > 0 && <span className="text-xs text-lt-faint">{cuantos(descendientes)}</span>}
      </div>
      {abierto && hijos.length > 0 && (
        <ul id={id} className="ml-5 space-y-1 border-l border-lt-border pl-2">
          {hijos.map((h) => <Nodo key={h.activo.id} nodo={h} abiertoInicial={abiertoInicial} />)}
        </ul>
      )}
    </li>
  );
}
