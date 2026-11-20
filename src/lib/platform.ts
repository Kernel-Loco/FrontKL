// Lógica sin red del selector de empresa del superadmin (RC-332). Sin imports con @/ para que node --test la cargue.
import type { OrganizationStatus, PlatformOrganization } from "@/types";

/** Estados en que la API deja trabajar en una empresa (cirdan/api/plataforma.py, ACTIVAS). */
const WORKABLE: ReadonlySet<OrganizationStatus> = new Set(["trial", "active"]);

const STATUS_NOTE: Partial<Record<OrganizationStatus, string>> = {
  trial: "prueba",
  suspended: "suspendida",
  cancelled: "cancelada",
};

export function canWorkIn(org: PlatformOrganization): boolean {
  return WORKABLE.has(org.status);
}

/** Texto de cada opción: el nombre, y entre paréntesis si es la propia o su estado. */
export function organizationOptionLabel(org: PlatformOrganization): string {
  const notes = [org.home ? "tu empresa" : null, STATUS_NOTE[org.status] ?? null].filter(Boolean);
  return notes.length ? `${org.name} (${notes.join(", ")})` : org.name;
}

/** La empresa propia primero y luego por nombre, sin importar acentos ni mayúsculas. */
export function sortOrganizations(items: readonly PlatformOrganization[]): PlatformOrganization[] {
  return [...items].sort((a, b) => Number(b.home) - Number(a.home) || a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

/** Compara la sesión que dibujó la página con la empresa activa de la lista actual. */
export function organizationListState(items: readonly PlatformOrganization[], renderedOrganizationId: string): "current" | "changed" | "invalid" {
  const active = items.filter((org) => org.active);
  if (active.length !== 1) return "invalid";
  return active[0]!.id === renderedOrganizationId ? "current" : "changed";
}

/**
 * Canal entre pestañas del mismo navegador. La empresa activa vive en la sesión del servidor, que comparten todas las
 * pestañas: cuando una cambia, las demás recargan para no seguir mostrando la anterior mientras sus peticiones ya van
 * a la nueva.
 */
export const ORGANIZATION_CHANNEL = "lowtide-empresa-activa";

/**
 * Si tras un cambio fallido hay que recargar. Con 403, 404 o 409 la API respondió que no cambió nada. Con otro error
 * (tiempo agotado, 5xx o sin conexión) no se sabe si la sesión ya cambió: recargar muestra la empresa real.
 */
export function reloadAfterFailedSwitch(status: number | undefined): boolean {
  // 401: el cliente ya mandó a /auth/expirada, y recargar /dashboard pisaría esa navegación.
  return status !== 401 && status !== 403 && status !== 404 && status !== 409;
}

/** Si tras un cambio fallido conviene volver a pedir la lista: la empresa ya no existe o cambió de estado. */
export function refreshListAfterFailedSwitch(status: number | undefined): boolean {
  return status === 404 || status === 409;
}

/** Mensaje de un cambio fallido. 401 no llega aquí: el cliente ya manda a /auth/expirada. */
export function switchErrorMessage(status: number | undefined, apiMessage: string | undefined): string {
  switch (status) {
    case 403:
      return "Tu cuenta ya no tiene permiso de superadmin. Vuelve a iniciar sesión.";
    case 404:
      return "Esa empresa ya no existe. Se intentará actualizar la lista.";
    case 409:
      return apiMessage || "La empresa está suspendida o cancelada: no se puede trabajar en ella.";
    default:
      return apiMessage || "No pudimos cambiar de empresa. Intenta de nuevo en unos momentos.";
  }
}
