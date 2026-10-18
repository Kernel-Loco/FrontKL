// Cliente HTTP para la API de FastAPI. En el navegador llama a /api/v1 del propio portal
// (Next lo reenvía, ver next.config.ts) para que la cookie de sesión viaje sola.

const API_URL = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body" | "method"> & { body?: unknown };

async function request<T>(method: string, path: string, { body, headers, ...init }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    method,
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

  if (!response.ok) {
    const detail = await response.json().catch(() => undefined);
    // FastAPI devuelve los errores como { detail: ... }.
    const message =
      detail && typeof detail === "object" && "detail" in detail && typeof detail.detail === "string"
        ? detail.detail
        : response.status === 422
          ? "Revisa los datos e inténtalo de nuevo."
          : response.statusText;
    throw new ApiError(response.status, message, detail);
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
