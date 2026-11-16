// Reglas de las llaves de API del portal contra BackKL cirdan/api/llaves.py (RC-129). Solo importa tipos, que node
// borra al quitar los tipos: así node --test la importa directo (src/lib/llavesApi.test.mjs).
import type { ApiKey, ApiKeyRequest, ApiKeyStatus } from "@/types";

/** Igual que DIAS_MAXIMO de llaves.py y el CHECK de api_keys.expires_at. */
export const API_KEY_MAX_DAYS = 90;
/** Igual que el max_length de name en LlaveIn de llaves.py. */
export const API_KEY_NAME_MAX = 80;
/** Único alcance que da el backend (api_keys.LECTURA): los GET de datos de /api/v1. */
export const API_KEY_SCOPE = "read";

export const API_KEY_OWN_USE_ERROR = "Confirma que la llave es solo para los sistemas de tu propia empresa.";

// Los mismos que rechaza _texto de llaves.py: menores que 32 y el 127.
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Largo como lo cuenta len() de Python en el max_length de LlaveIn: por code point, no por unidad UTF-16 de JS. */
export function largoDelNombre(nombre: string): number {
  return [...nombre].length;
}

/** Mensaje para mostrar si la petición no pasaría la validación del backend, o null si pasa. */
export function validarLlave(request: ApiKeyRequest): string | null {
  if (request.own_use !== true) return API_KEY_OWN_USE_ERROR;
  const nombre = request.name.trim();
  if (!nombre) return "Ponle un nombre a la llave.";
  if (largoDelNombre(nombre) > API_KEY_NAME_MAX) return `El nombre va hasta ${API_KEY_NAME_MAX} caracteres.`;
  if (CONTROL.test(nombre)) return "El nombre no puede llevar caracteres de control.";
  const dias = request.expires_in_days;
  if (!Number.isInteger(dias) || dias < 1 || dias > API_KEY_MAX_DAYS) return `La vigencia va de 1 a ${API_KEY_MAX_DAYS} días.`;
  return null;
}

/** Cuerpo de POST /api/v1/api-keys. Sin dominio la llave lee todos los de la empresa, así que no se manda vacío. */
export function cuerpoDeLlave(request: ApiKeyRequest): ApiKeyRequest {
  const domain = request.domain?.trim();
  return {
    name: request.name.trim(),
    ...(domain ? { domain } : {}),
    expires_in_days: request.expires_in_days,
    own_use: true,
  };
}

/** DELETE responde 204 sin cuerpo: la fila se marca revocada en la pantalla. Revocar otra vez no cambia la fecha. */
export function marcarRevocada(key: ApiKey, ahora: string): ApiKey {
  if (key.revoked_at) return key;
  return { ...key, revoked_at: ahora, status: "revoked" };
}

/**
 * Estado a la vista. LISTA_SQL de llaves.py lo calcula con su now() al pedir la lista, así que una llave que vence con
 * la página abierta se pasa a 'expired' con la hora del navegador. ahora va en milisegundos, como Date.now().
 */
export function estadoVisible(key: ApiKey, ahora: number): ApiKeyStatus {
  if (key.status === "active" && Date.parse(key.expires_at) <= ahora) return "expired";
  return key.status;
}

/** Llaves vigentes a la hora dada, con el mismo estado que muestra la tabla. */
export function contarActivas(keys: readonly ApiKey[], ahora: number = Date.now()): number {
  return keys.filter((k) => estadoVisible(k, ahora) === "active").length;
}
