import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainTabs, domainTabs } from "@/components/screens/detalle/DomainTabs";
import { FindingsExplorer } from "@/components/screens/hallazgos/FindingsExplorer";
import { DomainPicker } from "@/components/screens/shared/DomainPicker";
import { scoredDomains } from "@/components/screens/shared/domainState";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { canAccessSection, SECTIONS } from "@/config/permissions";
import { getDomainFindings, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.hallazgos.label };

type Props = { searchParams: Promise<{ dominio?: string | string[] }> };

export default async function HallazgosPage({ searchParams }: Props) {
  const { user, forbidden } = await checkSectionAccess("hallazgos");
  if (forbidden) return forbidden;

  const options = scoredDomains((await getDomains()).items).map((d) => d.fqdn);
  const { dominio } = await searchParams;
  const fqdn = typeof dominio === "string" && options.includes(dominio) ? dominio : options[0];

  if (!fqdn) {
    return (
      <div className="space-y-8">
        <PageHeader title="Hallazgos" />
        <Card>
          <EmptyState title="Todavía no hay dominios escaneados">Los hallazgos aparecen después del primer escaneo.</EmptyState>
        </Card>
      </div>
    );
  }

  const findings = await getDomainFindings(fqdn);
  const canOpenDetail = canAccessSection(user.role, "detalle");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: fqdn, href: canOpenDetail ? `/dashboard/dominios/${fqdn}` : undefined }, { label: "Hallazgos" }]}
        title="Hallazgos"
        actions={<DomainPicker domains={options} value={fqdn} />}
      />
      {canOpenDetail && <DomainTabs tabs={domainTabs(fqdn, findings.total, "hallazgos", true)} />}
      <FindingsExplorer key={fqdn} findings={findings.items} />
    </div>
  );
}
