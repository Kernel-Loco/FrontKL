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
import { coverageIncomplete } from "@/lib/cobertura";
import { leerAgrupar } from "@/lib/planAcumulado";
import { getActionPlan, getDomainFindings, getDomains, getDomainScore } from "@/services/queries";
import { tx } from "@/i18n/tx";

export const metadata: Metadata = { title: SECTIONS.plan.label };

type Props = { searchParams: Promise<{ dominio?: string | string[]; agrupar?: string | string[] }> };

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
        <PageHeader title={tx("Plan de acción")} description={tx("Recomendaciones para reducir la exposición del dominio.")} />
        <Card>
          <EmptyState title={tx("Sin dominios con score")}>{tx("El plan aparecerá cuando un dominio complete su primer escaneo.")}</EmptyState>
        </Card>
      </div>
    );
  }

  // Sin la sección Hallazgos (gerente) no se pide /findings, que le responde 403, y la pestaña no se muestra (RC-280).
  const canSeeFindings = canAccessSection(user.role, "hallazgos");
  // Por activo dice qué reglas tiene cada activo, como Hallazgos: el gerente se queda con el plan por regla (RC-263).
  const agrupar = canSeeFindings ? leerAgrupar(params.agrupar) : "regla";
  const selectedDomain = domains.find((domain) => domain.fqdn === fqdn);
  const [plan, findings, score] = await Promise.all([
    getActionPlan(fqdn, agrupar),
    canSeeFindings ? getDomainFindings(fqdn) : Promise.resolve(null),
    getDomainScore(fqdn),
  ]);
  const canOpenDetail = canAccessSection(user.role, "detalle");
  const canExport = selectedDomain?.authorization.status === "valid";

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: fqdn, href: canOpenDetail ? `/dashboard/dominios/${fqdn}` : undefined }, { label: tx("Plan de acción") }]}
        title={tx("Plan de acción")}
        description={tx("Revisa el impacto estimado y combina acciones para comparar el score resultante.")}
        actions={<DomainPicker domains={options} value={fqdn} />}
      />
      {canOpenDetail && <DomainTabs tabs={domainTabs(fqdn, findings?.total ?? 0, "plan", canSeeFindings, true, coverageIncomplete(score))} />}
      <ActionPlanExplorer key={`${fqdn}-${agrupar}`} plan={plan} canSeeFindings={canSeeFindings} canGroupByAsset={canSeeFindings} canExport={canExport} />
    </div>
  );
}