// Captcha del inicio de sesión (RC-154): widget ALTCHA autohospedado. El navegador resuelve una prueba de trabajo
// con el reto que da la API (GET /api/v1/auth/captcha) y el resultado viaja en el campo `captcha` de /login.
// Nada sale a terceros: el reto, la solución y la revisión son del propio portal y su API.

/** El widget pide aquí cada reto. Pasa por el reenvío de /api/v1 de next.config.ts, como el resto de la API. */
export const CAPTCHA_URL = "/api/v1/auth/captcha";

export const CAPTCHA_LANGUAGE = "es-419";

/** Textos del widget. altcha trae es-419, pero su paquete no tiene los tipos de ese archivo: se ponen aquí. */
export const CAPTCHA_STRINGS = {
  ariaLinkLabel: "ALTCHA (sitio oficial)",
  enterCode: "Escribe el código",
  enterCodeAria: "Escribe el código que escuchas. Pulsa Espacio para oír el audio.",
  error: "No se pudo verificar. Inténtalo de nuevo.",
  expired: "La verificación venció. Márcala otra vez.",
  footer:
    'Protegido por <a href="https://altcha.org/" target="_blank" rel="noopener noreferrer" aria-label="ALTCHA (sitio oficial, se abre en otra pestaña)">ALTCHA</a>',
  getAudioChallenge: "Pedir un reto de audio",
  label: "No soy un robot",
  loading: "Cargando…",
  reload: "Volver a cargar",
  verify: "Verificar",
  verificationRequired: "Falta la verificación.",
  verified: "Verificado",
  verifying: "Verificando…",
  waitAlert: "Verificando, espera un momento.",
} as const;

/**
 * Lo que se le pasa al widget además de sus atributos. Sin el colector de interacción (humanInteractionSignature):
 * la API no lo revisa y serían datos del navegador que no hacen falta. Nunca `test`, que da por buena cualquier cosa.
 */
export const CAPTCHA_CONFIG = { humanInteractionSignature: false } as const;

/** Lo mismo que acepta la API (cirdan/auth/captcha.py, MAX_PAYLOAD). */
export const CAPTCHA_MAX_LENGTH = 4096;

/**
 * El campo `captcha` para /login, o null si lo que dio el widget no es una solución: vacío, demasiado largo,
 * no es base64 o es el resultado del modo de prueba del widget ({ test: true }), que la API rechazaría.
 */
export function captchaPayload(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > CAPTCHA_MAX_LENGTH) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const data = JSON.parse(atob(value)) as { challenge?: { parameters?: unknown }; solution?: unknown } | null;
    return data?.challenge?.parameters && data.solution ? value : null;
  } catch {
    return null;
  }
}
