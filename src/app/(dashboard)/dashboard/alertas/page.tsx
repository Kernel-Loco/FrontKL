import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AlertPoliciesForm } from "@/components/screens/alertas/AlertPoliciesForm";
import { SECTIONS } from "@/config/permissions";
import { getAlertPolicies } from "@/services/settingsService";

export const metadata: Metadata = { title: SECTIONS.alertas.label };

export default async function AlertasPage() {
  const { forbidden } = await checkSectionAccess("alertas");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.alertas.label} description="Cuándo avisa Lowtide y con qué umbral de riesgo." />
      <AlertPoliciesForm initial={await getAlertPolicies()} />
    </div>
  );
}
