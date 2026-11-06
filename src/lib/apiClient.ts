// Cliente HTTP para la API de FastAPI. En el navegador llama a /api/v1 del propio portal
// (Next lo reenvía, ver next.config.ts) para que la cookie de sesión viaje sola.

import { parseRetryAfter, statusFromFetchFailure, withTimeout } from "./http";

const API_URL = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  /** Segundos de espera que pidió la API en un 429. */
  readonly retryAfter?: number;

  constructor(status: number, message: string, detail?: unknown, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }
}

/** Error de una respuesta no exitosa. Lo usa también quien llama a `fetch` por su cuenta. */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const detail = await response.json().catch(() => undefined);
  // FastAPI devuelve los errores como { detail: ... }.
  const message =
    detail && typeof detail === "object" && "detail" in detail && typeof detail.detail === "string"
      ? detail.detail
      : response.status === 422
        ? "Revisa los datos e inténtalo de nuevo."
        : response.statusText;
  return new ApiError(response.status, message, detail, parseRetryAfter(response.headers));
}

// Rutas de /auth donde un 401 es una respuesta normal (credenciales o código incorrectos), no una sesión vencida.
function isSessionProtected(path: string) {
  return !path.startsWith("/auth/") || path === "/auth/me";
}

type RequestOptions = Omit<RequestInit, "body" | "method"> & { body?: unknown };

async function request<T>(method: string, path: string, { body, headers, ...init }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
    ...init,
    method,
    signal: withTimeout(init.signal),
    // La sesión viaja en la cookie httpOnly emitida por FastAPI; nunca en headers
    // construidos con tokens guardados en el navegador.
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(statusFromFetchFailure(error, init.signal), "Sin conexión con el servicio.");
  }

  if (!response.ok) {
    // Sesión vencida: de vuelta al login (la ruta borra la cookie).
    if (response.status === 401 && typeof window !== "undefined" && isSessionProtected(path)) {
      // Es un route handler (borra la cookie), no una página: requiere navegación completa.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/auth/expirada";
    }
    throw await apiErrorFromResponse(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
