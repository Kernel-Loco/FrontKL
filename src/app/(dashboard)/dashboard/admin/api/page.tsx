import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { ApiKeysManager } from "@/components/screens/admin/ApiKeysManager";
import { SECTIONS } from "@/config/permissions";
import { getApiKeys } from "@/services/adminService";

export const metadata: Metadata = { title: SECTIONS.api.label };

export default async function ApiAccessPage() {
  const { forbidden } = await checkSectionAccess("api");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.api.label} description="Llaves para que otros sistemas consulten Lowtide. Solo se guarda su huella, nunca la llave completa." />
      <ApiKeysManager initial={(await getApiKeys()).items} />
    </div>
  );
}
