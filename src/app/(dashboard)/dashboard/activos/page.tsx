import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AssetsInventory } from "@/components/screens/activos/AssetsInventory";
import { SelectorVista } from "@/components/screens/activos/SelectorVista";
import { canAccessSection, SECTIONS } from "@/config/permissions";
import { consultasArbol, conVista, leerVista, MAX_ARBOL, paginasCuadran, soloArbol, type Vista } from "@/lib/arbolActivos";
import { consultaActivos, leerFiltros, urlFiltros, type FiltrosActivos } from "@/lib/filtrosActivos";
import { getAssets, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.activos.label };

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<{ dominio?: Param; tipo?: Param; q?: Param; pagina?: Param; vista?: Param }> };

/**
 * Para el árbol (RC-248): todos los activos del filtro hasta MAX_ARBOL, en peticiones de 200. La primera da el total y
 * las demás van juntas. Si entre una y otra cambió la lista (un escaneo que agrega o quita activos), se pide todo otra
 * vez una sola vez y, si sigue sin cuadrar, el árbol sale con un aviso (armarArbol no repite un id). Si falla una
 * petición que no es la primera, el árbol sale con lo que sí llegó y otro aviso. Al navegador solo van los campos del
 * árbol (soloArbol), no los atributos ni las fechas.
 */
async function activosDelArbol(filtros: FiltrosActivos) {
  const base = consultaActivos(filtros, false);
  for (let intento = 1; ; intento++) {
    const primera = await getAssets(consultasArbol(base)[0]);
    const resto = await Promise.allSettled(consultasArbol(base, primera.total).slice(1).map((q) => getAssets(q)));
    const llegaron = [primera, ...resto.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))];
    const fallidas = resto.length + 1 - llegaron.length;
    const items = llegaron.flatMap((r) => r.items);
    const cambio = fallidas === 0 && !paginasCuadran(llegaron.map((r) => r.total), items.map((a) => a.id));
    if (cambio && intento === 1) continue;
    return {
      respuesta: { ...primera, items: [], limit: MAX_ARBOL, offset: 0 },
      arbol: { activos: items.map(soloArbol), total: primera.total, cambio, fallidas, partes: resto.length + 1 },
    };
  }
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
        description="Subdominios, certificados, IP, servicios y correos que dejan expuestos todos los dominios de la organización."
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
