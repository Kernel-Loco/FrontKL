import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { AuditExplorer } from "@/components/screens/admin/AuditExplorer";
import { SECTIONS } from "@/config/permissions";
import { getAuditLog } from "@/services/adminService";

export const metadata: Metadata = { title: SECTIONS.bitacora.label };

export default async function BitacoraPage() {
  const { forbidden } = await checkSectionAccess("bitacora");
  if (forbidden) return forbidden;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.bitacora.label} description="Todo lo que se hace en la organización, quién y cuándo." />
      <AuditExplorer entries={(await getAuditLog()).items} />
    </div>
  );
}
