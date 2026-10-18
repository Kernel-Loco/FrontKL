// Acciones de dominios desde el navegador (componentes de cliente). Las lecturas de las páginas
// están en queries.ts. La explicación ya viene de FastAPI; el alta de dominios y la verificación
// TXT siguen simuladas hasta #26.
import { apiClient } from "@/lib/apiClient";
import { mockDelay } from "@/lib/mock";
import { mockDomains } from "@/mocks/api/contrato";
import { mockTxtVerifications } from "@/mocks/api/provisional";
import type { Domain, DomainRegistrationRequest, FindingExplanation, TxtVerification } from "@/types";
import { ServiceError } from "./errors";

/** «¿Por qué es crítico?» de un hallazgo (GET /findings/{id}/explanation). */
export function getFindingExplanation(findingId: string): Promise<FindingExplanation> {
  return apiClient.get<FindingExplanation>(`/findings/${encodeURIComponent(findingId)}/explanation`);
}

const FQDN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Da de alta un dominio (solo Admin). Queda pendiente hasta que publique su registro TXT.
 * La carta firmada se sube junto con los datos.
 */
export async function registerDomain(
  request: DomainRegistrationRequest,
  letter: File,
): Promise<{ domain: Domain; txt: TxtVerification }> {
  // TODO: conectar con backend → POST /domains (multipart: datos + carta en PDF), #26
  await mockDelay(700);
  const fqdn = request.fqdn.trim().toLowerCase().replace(/\.$/, "");
  if (!FQDN.test(fqdn)) throw new ServiceError("invalid", "Escribe un dominio válido, como ejemplo.com.");
  if (mockDomains.items.some((d) => d.fqdn === fqdn)) throw new ServiceError("duplicate", "Ese dominio ya está registrado.");
  if (letter.type !== "application/pdf") throw new ServiceError("invalid", "La carta de autorización debe ser un PDF.");
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const domain: Domain = {
    id: crypto.randomUUID(),
    fqdn,
    status: "pending_verification",
    authorization: { status: "valid", valid_from: request.valid_from, valid_until: request.valid_until, signer_email: request.signer_email },
    txt: { status: "missing", checked_at: null },
    scan_eligibility: { can_scan: false, reasons: ["txt_not_verified"] },
    score: null,
    band: null,
    open_findings: { critical: 0, high: 0, medium: 0, low: 0 },
    last_scan_at: null,
    next_scan_at: null,
  };
  return { domain, txt: { fqdn, status: "missing", expected_value: `cirdan-verification=${token}`, checked_at: null } };
}

/** Vuelve a consultar el registro TXT de un dominio (solo Admin). */
export async function verifyTxt(fqdn: string): Promise<TxtVerification> {
  // TODO: conectar con backend → POST /domains/{fqdn}/txt/verify, #26
  await mockDelay(800);
  const current = mockTxtVerifications.items.find((v) => v.fqdn === fqdn);
  if (!current) throw new ServiceError("not_found", "Dominio no encontrado para esta organización");
  return { ...current, checked_at: new Date().toISOString() };
}
