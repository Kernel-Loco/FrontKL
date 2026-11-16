import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { ApiKeysManager } from "@/components/screens/admin/ApiKeysManager";
import { SECTIONS } from "@/config/permissions";
import { getApiKeys, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.api.label };

export default async function ApiAccessPage() {
  const { forbidden } = await checkSectionAccess("api");
  if (forbidden) return forbidden;

  const [keys, domains] = await Promise.all([getApiKeys(), getDomains()]);
  // Los mismos que acepta POST /api-keys: cualquier dominio de la empresa que no se haya quitado.
  const fqdns = domains.items.filter((d) => d.status !== "removed").map((d) => d.fqdn);

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.api.label} description="Llaves para que otros sistemas consulten LowTide. Solo se guarda su huella, nunca la llave completa." />
      <ApiKeysManager initial={keys.items} domains={fqdns} />
    </div>
  );
}
