import type { Metadata } from "next";
import { Globe, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainsAdmin } from "@/components/screens/dominios/DomainsAdmin";
import { RegisteredDomainsTable } from "@/components/screens/dominios/RegisteredDomainsTable";
import { Card } from "@/components/ui/Card";
import { can, canAccessSection, SECTIONS } from "@/config/permissions";
import { getDomains, getTxtVerifications } from "@/services/domainService";

export const metadata: Metadata = { title: SECTIONS.dominios.label };

export default async function DominiosPage() {
  const { user, forbidden } = await checkSectionAccess("dominios");
  if (forbidden) return forbidden;

  const domains = (await getDomains()).items.filter((d) => d.status !== "removed");
  const isAdmin = can(user.role, "register_domain");

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.dominios.label} description="Solo se escanean y reportan dominios con autorización vigente." />
      {isAdmin ? (
        <DomainsAdmin domains={domains} txt={(await getTxtVerifications()).items} />
      ) : (
        <Card
          title="Dominios registrados"
          icon={<Globe aria-hidden="true" className="h-4 w-4" />}
          action={`${domains.length} dominios en inventario`}
        >
          <div className="-mx-5">
            <RegisteredDomainsTable domains={domains} canOpenDetail={canAccessSection(user.role, "detalle")} />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-lt-muted">
            <TriangleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
            Un dominio vencido o por validar no se puede escanear ni exportar. Para registrar un dominio, pídeselo a un Administrador.
          </p>
        </Card>
      )}
    </div>
  );
}
