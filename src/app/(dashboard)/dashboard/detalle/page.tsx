import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { scoredDomains } from "@/components/screens/shared/domainState";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SECTIONS } from "@/config/permissions";
import { getDomains } from "@/services/domainService";

export const metadata: Metadata = { title: SECTIONS.detalle.label };

/** «Detalle de dominio» del menú: abre el dominio con más riesgo. */
export default async function DetallePage() {
  const { forbidden } = await checkSectionAccess("detalle");
  if (forbidden) return forbidden;

  const [top] = scoredDomains((await getDomains()).items);
  if (top) redirect(`/dashboard/dominios/${top.fqdn}`);

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.detalle.label} />
      <Card>
        <EmptyState title="Todavía no hay dominios escaneados">El detalle aparece después del primer escaneo de un dominio autorizado.</EmptyState>
      </Card>
    </div>
  );
}
