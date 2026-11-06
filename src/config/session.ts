// Política de sesión (OWASP ASVS V3 / ISO 27001): cierre tras 15 min de inactividad y tope absoluto
// de 8 h. Los valores reales los manda la API en /auth/me; lo de aquí es el respaldo si no los manda.

const DEFAULT_IDLE_MS = 15 * 60_000;

// Solo desarrollo: acorta la inactividad para probar. Nunca la alarga más allá de lo que tolera el servidor.
const configuredMinutes = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES);
const IDLE_OVERRIDE_MS = Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes * 60_000 : undefined;

export const IDLE_TIMEOUT_MS = IDLE_OVERRIDE_MS ?? DEFAULT_IDLE_MS;

/** Inactividad que cuenta el portal: la del servidor si la informa (y el ajuste de desarrollo, si es menor). */
export function effectiveIdleMs(serverSeconds?: number): number {
  const server = serverSeconds && serverSeconds > 0 ? serverSeconds * 1000 : undefined;
  if (server === undefined) return IDLE_TIMEOUT_MS;
  return IDLE_OVERRIDE_MS === undefined ? server : Math.min(server, IDLE_OVERRIDE_MS);
}

/** Antelación con la que se avisa antes de cerrar por inactividad. */
export function idleWarningMs(idleMs: number): number {
  return Math.min(60_000, idleMs / 2);
}

/** Antelación del aviso antes del tope absoluto, que no se puede extender. */
export const ABSOLUTE_WARNING_MS = 5 * 60_000;

/** Cada cuánto, como máximo, la actividad renueva la cookie de sesión. */
export const SESSION_REFRESH_INTERVAL_MS = 30_000;

/** Evento que lanza apiClient cuando una petición autenticada sale bien: el servidor renovó la inactividad. */
export const API_ACTIVITY_EVENT = "lowtide-api-activity";

/**
 * Vida de la cookie mock: el timeout más un margen, para que la cookie no
 * expire antes de que el aviso de inactividad pueda mostrarse.
 */
export const SESSION_COOKIE_MAX_AGE_S = Math.ceil(IDLE_TIMEOUT_MS / 1000) + 120;