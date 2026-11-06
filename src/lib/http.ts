// Piezas comunes de apiClient (navegador) y apiServer (servidor). No importa nada del servidor.

export const REQUEST_TIMEOUT_MS = 15_000;

/** Status sintéticos para fallos que no llegaron a tener respuesta HTTP. */
export const STATUS_NETWORK = 0;
export const STATUS_TIMEOUT = 504;

/** Segundos de espera que indica la API en `Retry-After` (solo la forma numérica). */
export function parseRetryAfter(headers: Headers): number | undefined {
  const seconds = Number(headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

/** Une la señal del llamador con el tope de tiempo. */
export function withTimeout(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** Convierte un fallo de `fetch` en un status sintético; relanza si el propio llamador canceló. */
export function statusFromFetchFailure(error: unknown, callerSignal?: AbortSignal | null): number {
  if (callerSignal?.aborted) throw error;
  return error instanceof DOMException && error.name === "TimeoutError" ? STATUS_TIMEOUT : STATUS_NETWORK;
}
