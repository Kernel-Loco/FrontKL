import type { Metadata } from "next";
import { Globe, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { DomainsAdmin } from "@/components/screens/dominios/DomainsAdmin";
import { RegisteredDomainsTable } from "@/components/screens/dominios/RegisteredDomainsTable";
import { Card } from "@/components/ui/Card";
import { can, canAccessSection, SECTIONS } from "@/config/permissions";
import { cantidad } from "@/lib/format";
import { getDomains, getSignatureRequests, getTxtVerifications } from "@/services/queries";
import { tx } from "@/i18n/tx";

export const metadata: Metadata = { title: SECTIONS.dominios.label };

export default async function DominiosPage() {
  const { user, forbidden } = await checkSectionAccess("dominios");
  if (forbidden) return forbidden;

  const domains = (await getDomains()).items.filter((d) => d.status !== "removed");
  const isAdmin = can(user.role, "register_domain");

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.dominios.label} description={tx("Solo se escanean y reportan dominios con autorización vigente.")} />
      {isAdmin ? (
        <DomainsAdmin
          domains={domains}
          txt={(await getTxtVerifications()).items}
          // Sin la lista (API sin RC-211, o 403 al Admin de plataforma en otra empresa, porque la firma la hace un Admin de
          // la propia empresa) la página sigue con la carta subida a mano.
          signatures={await getSignatureRequests().catch(() => ({ items: [], total: 0, mode: "off" as const }))}
        />
      ) : (
        <Card
          title={tx("Dominios registrados")}
          icon={<Globe aria-hidden="true" className="h-4 w-4" />}
          action={tx("{0} en inventario", cantidad(domains.length, "dominio"))}
        >
          <div className="-mx-5">
            <RegisteredDomainsTable domains={domains} canOpenDetail={canAccessSection(user.role, "detalle")} />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-lt-muted">
            <TriangleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
            {tx("Un dominio vencido o por validar no se puede escanear ni exportar. Para registrar un dominio, pídeselo a un Administrador.")}</p>
        </Card>
      )}
    </div>
  );
}
