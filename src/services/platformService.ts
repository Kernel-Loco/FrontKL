// Superadmin de la plataforma (RC-332): lista de empresas y cambio de empresa activa de la sesión.
// Solo desde el navegador: la cookie de sesión viaja sola por /api/v1 (ver src/lib/apiClient.ts).
import { apiClient } from "@/lib/apiClient";
import type { PlatformOrganizationList, PlatformSwitchResult } from "@/types";

export function listOrganizations(signal?: AbortSignal) {
  return apiClient.get<PlatformOrganizationList>("/platform/organizations", { signal });
}

export function switchOrganization(organization_id: string) {
  return apiClient.post<PlatformSwitchResult>("/platform/organization", { organization_id });
}
