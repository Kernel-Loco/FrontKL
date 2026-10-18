import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { IntegrationsManager } from "@/components/screens/admin/IntegrationsManager";
import { SECTIONS } from "@/config/permissions";
import { getIntegrations } from "@/services/adminService";

export const metadata: Metadata = { title: SECTIONS.webhooks.label };

export default async function WebhooksPage() {
  const { forbidden } = await checkSectionAccess("webhooks");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.webhooks.label} description="A dónde envía Lowtide las alertas: webhooks, SIEM o correo." />
      <IntegrationsManager initial={(await getIntegrations()).items} />
    </div>
  );
}
