import type { Metadata } from "next";
import { ListTree, Rows3 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AssetsInventory } from "@/components/screens/activos/AssetsInventory";
import { ActionLink } from "@/components/ui/ActionButton";
import { canAccessSection, SECTIONS } from "@/config/permissions";
import { consultasArbol, conVista, leerVista, MAX_ARBOL } from "@/lib/arbolActivos";
import { consultaActivos, leerFiltros, urlFiltros, type FiltrosActivos } from "@/lib/filtrosActivos";
import { getAssets, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.activos.label };

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<{ dominio?: Param; tipo?: Param; q?: Param; pagina?: Param; vista?: Param }> };

/**
 * Para el árbol (RC-248): todos los activos del filtro hasta MAX_ARBOL, en peticiones de 200. La primera da el total y
 * las demás van juntas. Si entre una y otra cambia la lista, armarArbol no repite un id.
 */
async function activosDelArbol(filtros: FiltrosActivos) {
  const base = consultaActivos(filtros, false);
  const primera = await getAssets(consultasArbol(base)[0]);
  const resto = await Promise.all(consultasArbol(base, primera.total).slice(1).map((q) => getAssets(q)));
  return { ...primera, items: [primera, ...resto].flatMap((r) => r.items), limit: MAX_ARBOL, offset: 0 };
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
  const activos = vista === "arbol" ? await activosDelArbol(filtros) : await getAssets(consultaActivos(filtros));
  // El cambio de vista conserva dominio, tipo y texto y vuelve a la página 1 (el árbol no pagina).
  const otraVista = vista === "arbol"
    ? { href: conVista(urlFiltros({ ...filtros, pagina: 1 }), "lista"), texto: "Ver en lista", Icono: Rows3 }
    : { href: conVista(urlFiltros({ ...filtros, pagina: 1 }), "arbol"), texto: "Ver en árbol", Icono: ListTree };

  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.activos.label}
        description="Subdominios, certificados, IP, servicios y correos que dejan expuestos todos los dominios de la organización."
        actions={
          <ActionLink href={`/dashboard/activos${otraVista.href}`} size="sm">
            <otraVista.Icono aria-hidden="true" className="h-4 w-4" />{otraVista.texto}
          </ActionLink>
        }
      />
      <AssetsInventory
        filtros={filtros}
        dominios={dominios}
        conCarta={conCarta}
        activos={activos}
        canOpenDetail={canAccessSection(user.role, "detalle")}
        vista={vista}
      />
    </div>
  );
}
