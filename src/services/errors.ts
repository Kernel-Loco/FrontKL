import { ApiError } from "@/lib/apiClient";
import { STATUS_NETWORK } from "@/lib/http";

interface ServiceErrorOptions {
  /** Status HTTP (o sintético: 0 sin red, 504 tiempo agotado) de la falla de la API. */
  status?: number;
  retryAfter?: number;
}

const DIGEST_PREFIX = "lt-api";

/** Error con un mensaje apto para mostrar al usuario. */
export class ServiceError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly retryAfter?: number;
  /** Next conserva este valor al cruzar al navegador (el `message` de un error del servidor no llega en producción). */
  readonly digest?: string;

  constructor(code: string, message: string, { status, retryAfter }: ServiceErrorOptions = {}) {
    super(message);
    if (status !== undefined) this.digest = `${DIGEST_PREFIX}:${status}:${retryAfter ?? ""}`;
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** El mensaje vino del { detail: "..." } de FastAPI, no del statusText. */
function hasApiDetail(error: ApiError) {
  const detail = error.detail;
  return typeof detail === "object" && detail !== null && "detail" in detail && detail.detail === error.message;
}

const GENERIC_MESSAGE = "No pudimos completar la solicitud. Intenta de nuevo en unos momentos.";

/** Mensaje propio para los casos de falla de la API; undefined si el status no tiene uno. */
export function messageForStatus(status: number, retryAfter?: number): string | undefined {
  if (status === STATUS_NETWORK) return "No hay conexión con el servicio. Revisa tu red e inténtalo de nuevo.";
  if (status === 401) return "Tu sesión venció. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 429) {
    return retryAfter
      ? `Hiciste demasiadas solicitudes. Espera ${retryAfter} ${retryAfter === 1 ? "segundo" : "segundos"} e inténtalo de nuevo.`
      : "Hiciste demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
  }
  if (status >= 500) return "El servicio no está disponible por ahora. Intenta de nuevo en unos minutos.";
  return undefined;
}

/** `apiMessageOn403`: el 403 muestra el detail de la API (p. ej. dominio sin autorización vigente, #24) en vez del de rol. */
export function getErrorMessage(error: unknown, { apiMessageOn403 = false }: { apiMessageOn403?: boolean } = {}): string {
  if (error instanceof ServiceError) return error.message;
  if (error instanceof ApiError) {
    // 401 de /auth (credenciales o código incorrectos) trae su propio mensaje; sin él es sesión vencida.
    if (error.status === 401 && error.message) return error.message;
    if (apiMessageOn403 && error.status === 403 && hasApiDetail(error)) return error.message;
    const own = messageForStatus(error.status, error.retryAfter);
    if (own) return own;
    // Los demás 4xx de FastAPI ya traen un mensaje en español apto para mostrar.
    if (error.status >= 400 && error.status < 500 && error.message) return error.message;
  }
  return GENERIC_MESSAGE;
}

/** Recupera el mensaje de una falla de la API a partir del `digest` de un error del servidor. */
export function messageFromDigest(error: unknown): string | undefined {
  const digest = error instanceof Error ? (error as { digest?: unknown }).digest : undefined;
  if (typeof digest !== "string") return undefined;
  const [prefix, status, retryAfter] = digest.split(":");
  if (prefix !== DIGEST_PREFIX) return undefined;
  return messageForStatus(Number(status), retryAfter ? Number(retryAfter) : undefined);
}
