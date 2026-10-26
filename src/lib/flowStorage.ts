// Estado temporal entre pasos de un flujo (login → MFA, recuperación de contraseña).
// Vive solo en la memoria de la pestaña: mfa_token y reset_token no van a sessionStorage, donde
// cualquier script de la página los leería en claro (alerta de CodeQL). Los pasos usan
// router.push, así que el estado pasa de una página a otra. Si se recarga la pestaña, el flujo
// pide empezar de nuevo.
// TODO: conectar con backend — idealmente FastAPI mantiene el estado "MFA pendiente"
// y "reset autorizado" en cookies httpOnly de vida corta, y esto deja de ser necesario.

export interface FlowData {
  mfa: { mfa_token: string };
  reset: { email: string; reset_token?: string };
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
