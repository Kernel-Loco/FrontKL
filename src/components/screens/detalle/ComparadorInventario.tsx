"use client";

// 'Comparar con mi inventario' del detalle del dominio (#146, RC-264). El CSV se lee aquí con File.text(): no se
// manda a la API ni se guarda en el navegador, y al recargar la página la comparación se pierde. La lógica vive en
// src/lib/inventario.ts. Todo lo que viene del archivo se pinta como texto con React, nunca como HTML.

import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { toCsv } from "@/lib/csv";
import {
  compararInventario,
  filasDesconocidos,
  InventarioError,
  leerInventario,
  MAX_BYTES,
  type EstadoInventario,
  type InventarioLeido,
  type ResultadoComparacion,
} from "@/lib/inventario";
import type { Asset } from "@/types";
import { tx, localized } from "@/i18n/tx";

type Filtro = "todos" | EstadoInventario;

const FILTROS: { valor: Filtro; texto: string }[] = localized([
  { valor: "todos", texto: "Todos" },
  { valor: "inventario", texto: "En tu inventario" },
  { valor: "desconocido", texto: "Desconocidos" },
]);

const numero = (n: number) => n.toLocaleString("es-MX");

/** Estado de la comparación para AssetsCard: resultado, filtro y los activos que se ven con ese filtro. */
export function useComparacionInventario(assets: Asset[]) {
  const [inventario, setInventario] = useState<(InventarioLeido & { archivo: string }) | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [error, setError] = useState<string | null>(null);
  const resultado = useMemo<ResultadoComparacion | null>(
    () => (inventario ? compararInventario(assets, inventario.entradas) : null),
    [assets, inventario],
  );
  const visibles = resultado && filtro !== "todos" ? assets.filter((a) => resultado.estados.get(a.id) === filtro) : assets;
  return { assets, inventario, setInventario, filtro, setFiltro, error, setError, resultado, visibles };
}

type Comparacion = ReturnType<typeof useComparacionInventario>;

export function EstadoInventarioBadge({ estado }: { estado: EstadoInventario | undefined }) {
  return estado === "inventario" ? <Badge tone="green">{tx("En tu inventario")}</Badge> : <Badge tone="amber">{tx("Desconocido")}</Badge>;
}

function descargarCsv(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ComparadorInventario({ control }: { control: Comparacion }) {
  const { assets, inventario, setInventario, filtro, setFiltro, error, setError, resultado, visibles } = control;
  const entrada = useRef<HTMLInputElement>(null);
  const idAyuda = useId();
  const [leyendo, setLeyendo] = useState(false);

  const alElegir = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setError(null);
    if (archivo.size > MAX_BYTES) {
      setError(tx("El archivo pasa de 1 MB."));
      return;
    }
    setLeyendo(true);
    try {
      const leido = leerInventario(await archivo.text());
      setInventario({ ...leido, archivo: archivo.name });
      setFiltro("todos");
    } catch (e) {
      setError(e instanceof InventarioError ? e.message : tx("No se pudo leer el archivo."));
    } finally {
      setLeyendo(false);
    }
  };

  const quitar = () => {
    setInventario(null);
    setFiltro("todos");
    setError(null);
  };

  const exportar = () => {
    if (!resultado) return;
    descargarCsv("activos-desconocidos.csv", toCsv(filasDesconocidos(assets, resultado.estados)));
  };

  return (
    <div className="space-y-3 border-b border-lt-border px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={entrada} type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={alElegir} />
        <ActionButton variant="secondary" size="sm" loading={leyendo} aria-describedby={idAyuda} onClick={() => entrada.current?.click()}>
          <Upload aria-hidden="true" className="h-4 w-4" />
          {inventario ? tx("Cambiar archivo") : tx("Comparar con mi inventario")}
        </ActionButton>
        {inventario && (
          <>
            <ActionButton variant="secondary" size="sm" disabled={!resultado?.desconocidos} onClick={exportar}>
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
              {tx("Exportar desconocidos (CSV)")}</ActionButton>
            <ActionButton variant="ghost" size="sm" onClick={quitar}>
              <X aria-hidden="true" className="h-4 w-4" />
              {tx("Quitar comparación")}</ActionButton>
          </>
        )}
      </div>
      <p id={idAyuda} className="text-xs text-lt-muted">
        {tx("CSV de hasta 1 MB y 5,000 filas, con una columna de valor (subdominio o IP) y, opcional, otra de tipo.")}{" "}<code>*.dominio</code> {" "}{tx("cubre sus subdominios. El archivo se lee en este navegador: no se manda a LowTide ni se guarda.")}</p>
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {inventario && resultado && (
        <>
          <InlineAlert tone="info">
            {tx("La comparación con")}{" "}<span className="break-all tabular-nums">{inventario.archivo}</span> {" "}{tx("vive solo en esta pestaña: si recargas la página se pierde y hay que volver a subir el archivo.")}</InlineAlert>
          {(inventario.invalidas > 0 || inventario.duplicadas > 0) && (
            <InlineAlert tone="warning">
              {inventario.invalidas === 1 && tx("Se ignoró 1 fila que no es subdominio ni IP o cuyo tipo no coincide con el valor. ")}
              {inventario.invalidas > 1 && tx("Se ignoraron {0} filas que no son subdominio ni IP o cuyo tipo no coincide con el valor. ", numero(inventario.invalidas))}
              {inventario.duplicadas === 1 && tx("1 fila estaba repetida.")}
              {inventario.duplicadas > 1 && tx("{0} filas estaban repetidas.", numero(inventario.duplicadas))}
            </InlineAlert>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm text-lt-text" aria-live="polite">
              <strong className="font-semibold">{numero(resultado.enInventario)}</strong> {" "}{tx("en tu inventario ·")}{" "}
              <strong className="font-semibold">{numero(resultado.desconocidos)}</strong> {" "}{tx("desconocidos · de")}{" "}{tx("{0} activos", numero(assets.length))}
            </p>
            <div role="group" aria-label={tx("Filtrar por estado")} className="flex flex-wrap gap-1">
              {FILTROS.map((f) => (
                <ActionButton key={f.valor} variant={filtro === f.valor ? "secondary" : "ghost"} size="sm" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
                  {f.texto}
                </ActionButton>
              ))}
            </div>
          </div>
          {visibles.length === 0 && <p className="text-sm text-lt-muted">{tx("Ningún activo con ese estado.")}</p>}
          {resultado.noVistos.length > 0 && (
            <details className="rounded-lg border border-lt-border px-3 py-2 text-sm">
              <summary className="cursor-pointer text-lt-text">
                {numero(resultado.noVistos.length)} {" "}{tx("de tu inventario que LowTide no vio")}</summary>
              <p className="mt-2 text-xs text-lt-muted">
                {tx("No aparecieron en las fuentes públicas de este escaneo. Eso no quiere decir que no existan.")}</p>
              <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto tabular-nums text-xs text-lt-muted">
                {resultado.noVistos.map((v) => (
                  <li key={v} className="break-all">{v}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
