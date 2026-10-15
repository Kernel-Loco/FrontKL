import { ApiError } from "@/lib/apiClient";

/** Error con un mensaje apto para mostrar al usuario. */
export class ServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ServiceError) return error.message;
  // Los errores 4xx de FastAPI ya traen un mensaje en español apto para mostrar.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.message) return error.message;
  return "No pudimos completar la solicitud. Intenta de nuevo en unos momentos.";
}
