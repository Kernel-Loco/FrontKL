// Acciones de dominios desde el navegador (componentes de cliente). Las lecturas de las páginas
// están en queries.ts.
import { apiClient } from "@/lib/apiClient";
import type { Domain, DomainRegistrationRequest, FindingExplanation, TxtVerification } from "@/types";

/** «¿Por qué es crítico?» de un hallazgo (GET /findings/{id}/explanation). */
export function getFindingExplanation(findingId: string): Promise<FindingExplanation> {
  return apiClient.get<FindingExplanation>(`/findings/${encodeURIComponent(findingId)}/explanation`);
}

/**
 * Da de alta un dominio (solo Admin). Queda pendiente hasta que publique su registro TXT.
 * La carta firmada se sube junto con los datos.
 */
export async function registerDomain(
  request: DomainRegistrationRequest,
  letter: File,
): Promise<{ domain: Domain; txt: TxtVerification }> {
  const bytes = new Uint8Array(await letter.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  }
  return apiClient.post("/domains", { ...request, letter_base64: btoa(binary) });
}

/** Vuelve a consultar el registro TXT de un dominio (solo Admin). */
export function verifyTxt(fqdn: string): Promise<{ domain: Domain; txt: TxtVerification }> {
  return apiClient.post(`/domains/${encodeURIComponent(fqdn)}/txt/verify`);
}
