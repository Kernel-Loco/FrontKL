import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AssetsInventory } from "@/components/screens/activos/AssetsInventory";
import { SelectorVista } from "@/components/screens/activos/SelectorVista";
import { canAccessSection, SECTIONS } from "@/config/permissions";
import { conVista, leerVista, MAX_ARBOL, soloArbol, traerArbol, type Vista } from "@/lib/arbolActivos";
import { consultaActivos, leerFiltros, urlFiltros, type FiltrosActivos } from "@/lib/filtrosActivos";
import { getAssets, getDomains } from "@/services/queries";
import { tx } from "@/i18n/tx";

export const metadata: Metadata = { title: SECTIONS.activos.label };

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<{ dominio?: Param; tipo?: Param; q?: Param; pagina?: Param; vista?: Param }> };

/**
 * Para el árbol (RC-248): todos los activos del filtro hasta MAX_ARBOL (traerArbol pide las páginas, repite una vez si
 * la lista cambió y cuenta las que fallan). unstable_rethrow deja pasar el redirect a /auth/expirada de apiServer.ts.
 * Al navegador solo van los campos del árbol (soloArbol), sin ids repetidos, no los atributos ni las fechas.
 */
async function activosDelArbol(filtros: FiltrosActivos) {
  const t = await traerArbol(consultaActivos(filtros, false), getAssets, unstable_rethrow);
  return {
    respuesta: { ...t.primera, items: [], limit: MAX_ARBOL, offset: 0 },
    arbol: { activos: t.activos.map(soloArbol), total: t.primera.total, cambio: t.cambio, fallidas: t.fallidas, partes: t.partes },
  };
}

/**
 * Inventario de activos de toda la organización (RC-231): filtros y página van en la URL y la API los aplica
 * (GET /api/v1/assets), así una búsqueda se puede compartir y la tabla no carga miles de filas.
 */
export default async function ActivosPage({ searchParams }: Props) {
  const { user, forbidden } = await checkSectionAccess("activos");
  if (forbidden) return forbidden;

  const lista = (await getDomains()).items;
  const dominios = lista.map((d) => d.fqdn);
  // La exportación solo trae dominios con autorización vigente (la API responde 403 con ?domain sin ella).
  const conCarta = lista.filter((d) => d.authorization.status === "valid").map((d) => d.fqdn);
  const params = await searchParams;
  const filtros = leerFiltros(params, dominios);
  const vista = leerVista(params.vista);
  const delArbol = vista === "arbol" ? await activosDelArbol(filtros) : null;
  const activos = delArbol ? delArbol.respuesta : await getAssets(consultaActivos(filtros));
  // El cambio de vista conserva dominio, tipo y texto y vuelve a la página 1 (el árbol no pagina).
  const hrefVista = (v: Vista) => `/dashboard/activos${conVista(urlFiltros({ ...filtros, pagina: 1 }), v)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.activos.label}
        description={tx("Subdominios, certificados, IP, servicios y correos que dejan expuestos todos los dominios de la organización.")}
        actions={<SelectorVista vista={vista} href={hrefVista} />}
      />
      <AssetsInventory
        filtros={filtros}
        dominios={dominios}
        conCarta={conCarta}
        activos={activos}
        canOpenDetail={canAccessSection(user.role, "detalle")}
        vista={vista}
        arbol={delArbol?.arbol}
      />
    </div>
  );
}
