// Política de sesión (OWASP ASVS V3 / ISO 27001): cierre tras 15 min de inactividad.

const configuredMinutes = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES);
const idleMinutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 15;

export const IDLE_TIMEOUT_MS = idleMinutes * 60_000;

/** Antelación con la que se avisa antes de cerrar la sesión. */
export const IDLE_WARNING_MS = Math.min(60_000, IDLE_TIMEOUT_MS / 2);

/** Cada cuánto, como máximo, la actividad renueva la cookie de sesión. */
export const SESSION_REFRESH_INTERVAL_MS = 30_000;

/**
 * Vida de la cookie mock: el timeout más un margen, para que la cookie no
 * expire antes de que el aviso de inactividad pueda mostrarse.
 */
export const SESSION_COOKIE_MAX_AGE_S = Math.ceil(IDLE_TIMEOUT_MS / 1000) + 120;
