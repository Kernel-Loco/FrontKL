import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainTabs, domainTabs } from "@/components/screens/detalle/DomainTabs";
import { ActionPlanExplorer } from "@/components/screens/plan/ActionPlanExplorer";
import { DomainPicker } from "@/components/screens/shared/DomainPicker";
import { scoredDomains } from "@/components/screens/shared/domainState";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { canAccessSection, SECTIONS } from "@/config/permissions";
import { getActionPlan, getDomainFindings, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.plan.label };

type Props = { searchParams: Promise<{ dominio?: string | string[] }> };

export default async function ActionPlanPage({ searchParams }: Props) {
  const { user, forbidden } = await checkSectionAccess("plan");
  if (forbidden) return forbidden;

  const [domainResponse, params] = await Promise.all([getDomains(), searchParams]);
  const domains = scoredDomains(domainResponse.items);
  const options = domains.map((domain) => domain.fqdn);
  const fqdn = typeof params.dominio === "string" && options.includes(params.dominio) ? params.dominio : options[0];

  if (!fqdn) {
    return (
      <div className="space-y-6">
        <PageHeader title="Plan de acción" description="Recomendaciones para reducir la exposición del dominio." />
        <Card>
          <EmptyState title="Sin dominios con score">El plan aparecerá cuando un dominio complete su primer escaneo.</EmptyState>
        </Card>
      </div>
    );
  }

  const [plan, findings] = await Promise.all([getActionPlan(fqdn), getDomainFindings(fqdn)]);
  const canOpenDetail = canAccessSection(user.role, "detalle");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: fqdn, href: canOpenDetail ? `/dashboard/dominios/${fqdn}` : undefined }, { label: "Plan de acción" }]}
        title="Plan de acción"
        description="Revisa el impacto estimado y combina acciones para comparar el score resultante."
        actions={<DomainPicker domains={options} value={fqdn} />}
      />
      {canOpenDetail && <DomainTabs tabs={domainTabs(fqdn, findings.total, "plan", canAccessSection(user.role, "hallazgos"))} />}
      <ActionPlanExplorer key={fqdn} plan={plan} />
    </div>
  );
}