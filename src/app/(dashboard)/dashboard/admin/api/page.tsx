import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { checkSectionAccess } from "@/components/dashboard/SectionAccess";
import { ApiKeysManager } from "@/components/screens/admin/ApiKeysManager";
import { SECTIONS } from "@/config/permissions";
import { ServiceError } from "@/services/errors";
import { getApiKeys, getDomains } from "@/services/queries";

export const metadata: Metadata = { title: SECTIONS.api.label };

export default async function ApiAccessPage() {
  const { forbidden } = await checkSectionAccess("api");
  if (forbidden) return forbidden;

  const [keys, domains] = await Promise.all([
    // Respaldo: si GET /api-keys falla en un refresco, la pantalla sigue montada con su lista y el aviso de copiar.
    getApiKeys().catch((error: unknown) => {
      if (error instanceof ServiceError) return null;
      throw error;
    }),
    // Los dominios solo llenan el selector: si /domains falla, la lista y la revocación siguen a la mano.
    getDomains().catch((error: unknown) => {
      if (error instanceof ServiceError) return null;
      throw error;
    }),
  ]);
  // Los mismos que acepta POST /api-keys: cualquier dominio de la empresa que no se haya quitado.
  const fqdns = domains ? domains.items.filter((d) => d.status !== "removed").map((d) => d.fqdn) : null;

  return (
    <div className="space-y-8">
      <PageHeader title={SECTIONS.api.label} description="Llaves para que otros sistemas consulten LowTide. Solo se guarda su huella, nunca la llave completa." />
      <ApiKeysManager initial={keys ? keys.items : null} domains={fqdns} />
    </div>
  );
}
