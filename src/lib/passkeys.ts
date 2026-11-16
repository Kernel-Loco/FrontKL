// Ayudas de las passkeys (RC-331). Sin React ni @simplewebauthn/browser, para probarlas con node --test.

/** Lo que importa de un WebAuthnError de @simplewebauthn/browser o de un DOMException del navegador. */
interface CeremonyError {
  name?: unknown;
  code?: unknown;
}

function fields(error: unknown): CeremonyError {
  return typeof error === "object" && error !== null ? (error as CeremonyError) : {};
}

/** La ceremonia se canceló porque empezó otra (el botón corta el autollenado) o porque la página se fue. */
export function isCeremonyAborted(error: unknown): boolean {
  const { name, code } = fields(error);
  return code === "ERROR_CEREMONY_ABORTED" || name === "AbortError";
}

/**
 * Mensaje de una falla del navegador o del autenticador, o undefined si no viene de WebAuthn (entonces es de la API y
 * lo da getErrorMessage). Un aborto no lleva mensaje: no es un error de la persona.
 */
export function ceremonyErrorMessage(error: unknown): string | undefined {
  const { name, code } = fields(error);
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || name === "InvalidStateError") {
    return "Este dispositivo ya tiene una passkey de tu cuenta.";
  }
  if (code === "ERROR_INVALID_DOMAIN" || code === "ERROR_INVALID_RP_ID" || name === "SecurityError") {
    return "Las passkeys solo funcionan en la dirección oficial de LowTide.";
  }
  if (name === "NotAllowedError") return "Se canceló la passkey o se agotó el tiempo. Inténtalo de nuevo.";
  if (name === "NotSupportedError" || code === "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT"
    || code === "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT") {
    return "Este dispositivo no admite passkeys con verificación (huella, rostro o PIN).";
  }
  if (typeof code === "string" && code.startsWith("ERROR_")) return "El navegador no pudo usar la passkey. Inténtalo de nuevo.";
  return undefined;
}

/** Nombre que se guarda: sin espacios de más y con el tope de 60 caracteres de la API. */
export function cleanPasskeyName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Fallas del registro que obligan a pedir la contraseña otra vez: el reto venció o ya se gastó. */
export function registrationMustRestart(status: number, message: string): boolean {
  return status === 400 && /venció|ya se usó|Empieza de nuevo/.test(message);
}

/** Veces que el autollenado se vuelve a armar solo tras un fallo, por carga de la página. */
/** Evento de window que avisa a la lista del perfil que la API borró passkeys fuera de ella. */
export const PASSKEYS_CHANGED = "lowtide:passkeys-changed";

/** Aviso tras cambiar la contraseña: la API borra las passkeys, que se registraron con la anterior. */
export function passwordChangedMessage(passkeysRemoved: number): string {
  if (passkeysRemoved <= 0) return "Tu contraseña se actualizó.";
  const passkeys = passkeysRemoved === 1 ? "tu passkey" : `tus ${passkeysRemoved} passkeys`;
  return `Tu contraseña se actualizó. Se ${passkeysRemoved === 1 ? "borró" : "borraron"} ${passkeys}: puedes registrar otra con la contraseña nueva.`;
}

export const MAX_AUTOFILL_RETRIES = 3;

/**
 * Si el autollenado se vuelve a armar tras este fallo. Solo tras uno de la API (el reto ya se gastó) o tras una
 * cancelación de la persona, y como máximo MAX_AUTOFILL_RETRIES veces. Las demás fallas del navegador (dominio, RP ID,
 * sin soporte) se repiten al instante: volver a armarlo sería un bucle que gasta las opciones de la IP.
 */
export function canRearmAutofill(error: unknown, retries: number): boolean {
  if (retries >= MAX_AUTOFILL_RETRIES) return false;
  if (ceremonyErrorMessage(error) === undefined) return true;
  return fields(error).name === "NotAllowedError";
}

/**
 * Cuándo renovar el reto del autollenado: unos 15 s antes de que venza en el servidor. El navegador no corta una
 * ceremonia con mediation conditional, así que sin esto el reto queda muerto mientras la página siga abierta.
 */
export function autofillRefreshMs(expiresInSeconds: number): number {
  return Math.max(expiresInSeconds - 15, 30) * 1000;
}

/**
 * El registro ya gastó el código TOTP: cualquier falla después pide esperar al siguiente código. Un 'Inténtalo de
 * nuevo.' al final del mensaje se quita: con la pista, sobra y se contradice.
 */
export function withNextCodeHint(message: string | null): string {
  const base = (message ?? "Se canceló la passkey.").replace(/\s*Inténtalo de nuevo\.?$/, "");
  return `${base} Para intentarlo otra vez, espera el siguiente código de tu app.`;
}
