import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AssetsInventory } from "@/components/screens/activos/AssetsInventory";
import { canAccessSection, SECTIONS } from "@/config/permissions";
import { consultaActivos, leerFiltros } from "@/lib/filtrosActivos";
import { getAssets, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.activos.label };

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<{ dominio?: Param; tipo?: Param; q?: Param; pagina?: Param }> };

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
  const filtros = leerFiltros(await searchParams, dominios);
  const activos = await getAssets(consultaActivos(filtros));

  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.activos.label}
        description="Subdominios, certificados, IP, servicios y correos que dejan expuestos todos los dominios de la organización."
      />
      <AssetsInventory
        filtros={filtros}
        dominios={dominios}
        conCarta={conCarta}
        activos={activos}
        canOpenDetail={canAccessSection(user.role, "detalle")}
      />
    </div>
  );
}
