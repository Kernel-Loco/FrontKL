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
  return "No pudimos completar la solicitud. Intenta de nuevo en unos momentos.";
}
