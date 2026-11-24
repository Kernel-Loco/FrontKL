// Estado temporal entre pasos de un flujo (login → MFA, pedir el enlace de recuperación → «Revisa tu correo»).
// Vive solo en la memoria de la pestaña: mfa_token no va a sessionStorage, donde cualquier script de la página lo
// leería en claro (alerta de CodeQL). Los pasos usan router.push, así que el estado pasa de una página a otra. Si se
// recarga la pestaña, el flujo pide empezar de nuevo. El token de recuperación (RC-335) no pasa por aquí: llega en el
// enlace del correo y solo lo lee la página que lo canjea.
// TODO: conectar con backend — idealmente FastAPI mantiene el estado "MFA pendiente" en una cookie httpOnly de vida
// corta, y esto deja de ser necesario.

export interface FlowData {
  mfa: { mfa_token: string };
  /** Alta de TOTP al entrar (RC-5): el token del 403 de /auth/login y su texto. */
  mfaEnroll: { mfa_setup_token: string; detail: string };
  /** El correo que se pidió y el texto de la API, el mismo exista o no la cuenta. */
  reset: { email: string; detail: string };
}

export type FlowKey = keyof FlowData;

const flows = new Map<FlowKey, string>();

export function readFlowRaw(key: FlowKey): string | null {
  return flows.get(key) ?? null;
}

export function parseFlow<K extends FlowKey>(raw: string | null): FlowData[K] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FlowData[K];
  } catch {
    return null;
  }
}

export function writeFlow<K extends FlowKey>(key: K, data: FlowData[K]) {
  flows.set(key, JSON.stringify(data));
}

export function clearFlow(key: FlowKey) {
  flows.delete(key);
}
