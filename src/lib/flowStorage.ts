// Estado temporal entre pasos de un flujo (login → MFA, recuperación de contraseña).
// Se guarda en sessionStorage para sobrevivir a una recarga de la pestaña.
// TODO: conectar con backend — idealmente FastAPI mantiene el estado "MFA pendiente"
// y "reset autorizado" en cookies httpOnly de vida corta, y esto deja de ser necesario.

export interface FlowData {
  mfa: { mfa_token: string };
  reset: { email: string; reset_token?: string };
}

export type FlowKey = keyof FlowData;

const storageKey = (key: FlowKey) => `cirdan_flow_${key}`;

export function readFlowRaw(key: FlowKey): string | null {
  try {
    return window.sessionStorage.getItem(storageKey(key));
  } catch {
    return null;
  }
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
  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(data));
  } catch {
    // Almacenamiento bloqueado: el flujo pedirá empezar de nuevo.
  }
}

export function clearFlow(key: FlowKey) {
  try {
    window.sessionStorage.removeItem(storageKey(key));
  } catch {
    // Nada que limpiar.
  }
}
