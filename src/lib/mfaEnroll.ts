// Alta de TOTP al entrar (RC-5): el Admin sin TOTP recibe en /auth/login un 403 sin sesión con
// { mfa_setup_required: true, mfa_setup_token }. Sin React, para probarlas con node --test.

/** Ruta de la pantalla del alta al entrar. */
export const MFA_ENROLL_PATH = "/login/mfa-alta";

// secrets.token_urlsafe(32) da 43 caracteres. La API rechaza más de 100.
const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;

/** El token del alta, solo si el 403 de /auth/login lo trae con su forma. Cualquier otro error da null. */
export function enrollTokenFrom(status: number, body: unknown): string | null {
  if (status !== 403 || typeof body !== "object" || body === null) return null;
  const { mfa_setup_required, mfa_setup_token } = body as Record<string, unknown>;
  if (mfa_setup_required !== true || typeof mfa_setup_token !== "string") return null;
  return TOKEN.test(mfa_setup_token) ? mfa_setup_token : null;
}

/** Se mandó un código sin QR pedido: se pide el QR con el mismo token. Con 5 códigos o 3 QR el token se gasta. */
export function enrollMustRescan(status: number, message: string): boolean {
  return status === 401 && /QR venció|Empieza de nuevo/.test(message);
}

/** El token del alta venció, ya se usó o la contraseña cambió: hay que volver a iniciar sesión. */
export function enrollMustRestart(status: number, message: string): boolean {
  return status === 401 && /expiró\. Inicia sesión/.test(message);
}
