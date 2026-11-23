// Acciones de dominios desde el navegador (componentes de cliente). Las lecturas de las páginas
// están en queries.ts.
import { apiClient } from "@/lib/apiClient";
import type {
  Domain,
  DomainRegistrationRequest,
  FindingExplanation,
  SignatureRequest,
  TxtVerification,
} from "@/types";

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
  return apiClient.post("/domains", { ...request, letter_base64: await toBase64(letter) });
}

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  }
  return btoa(binary);
}

/** Manda la carta sin firmar a Mifiel, que invita por correo a quien firma (camino B). */
export async function sendForSignature(request: DomainRegistrationRequest, letter: File): Promise<SignatureRequest> {
  return apiClient.post("/signature-requests", { ...request, letter_base64: await toBase64(letter) });
}

/** Consulta en Mifiel si ya se firmó. El servidor consulta a lo más una vez por minuto. */
export function refreshSignatureRequest(id: string): Promise<SignatureRequest> {
  return apiClient.post(`/signature-requests/${encodeURIComponent(id)}/refresh`);
}

export function cancelSignatureRequest(id: string): Promise<SignatureRequest> {
  return apiClient.post(`/signature-requests/${encodeURIComponent(id)}/cancel`);
}

/** Confirma la carta firmada escribiendo su dominio. Entonces nace la carta del dominio (y el dominio si no existía). */
export function acceptSignatureRequest(
  id: string,
  confirmFqdn: string,
): Promise<{ domain: Domain; txt: TxtVerification }> {
  return apiClient.post(`/signature-requests/${encodeURIComponent(id)}/accept`, { confirm_fqdn: confirmFqdn });
}

/** Sube el PDF firmado y el XML hechos en la web de Mifiel (camino A). Da de alta o renueva la carta del dominio. */
export async function uploadMifielSigned(
  request: DomainRegistrationRequest,
  letter: File,
  xml: File,
): Promise<{ domain: Domain; txt: TxtVerification }> {
  return apiClient.post("/signature-uploads", {
    ...request,
    letter_base64: await toBase64(letter),
    xml_base64: await toBase64(xml),
  });
}

/** Vuelve a consultar el registro TXT de un dominio (solo Admin). */
export function verifyTxt(fqdn: string): Promise<{ domain: Domain; txt: TxtVerification }> {
  return apiClient.post(`/domains/${encodeURIComponent(fqdn)}/txt/verify`);
}
