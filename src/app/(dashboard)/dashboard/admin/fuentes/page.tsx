import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { SourcesManager } from "@/components/screens/admin/SourcesManager";
import { SECTIONS } from "@/config/permissions";
import { getSources } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.fuentes.label };

export default async function FuentesPage() {
  const { forbidden } = await checkSectionAccess("fuentes");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.fuentes.label} description="Qué fuentes públicas consulta LowTide en los escaneos de tu empresa." />
      <SourcesManager initial={(await getSources()).items} />
    </div>
  );
}
