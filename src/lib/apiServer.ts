// Lecturas a FastAPI desde el servidor de Next (Server Components). Reenvía la cookie de sesión
// de quien hizo la petición, así RLS filtra por su empresa. Nunca importar desde el navegador.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { messageForStatus, ServiceError } from "@/services/errors";
import { parseRetryAfter, statusFromFetchFailure, withTimeout } from "./http";
import { SESSION_COOKIE } from "./session/shared";

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export async function apiGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let response: Response;
  try {
    response = await fetch(`${API_INTERNAL_URL}/api/v1${path}`, {
      headers: { Accept: "application/json", ...(token && { Cookie: `${SESSION_COOKIE}=${token}` }) },
      cache: "no-store",
      signal: withTimeout(),
    });
  } catch (error) {
    const status = statusFromFetchFailure(error);
    throw new ServiceError("api_error", messageForStatus(status) ?? "No pudimos cargar los datos.", { status });
  }
  // La sesión expiró en el servidor: se borra la cookie y vuelve al login.
  if (response.status === 401) redirect("/auth/expirada");
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { detail?: unknown } | undefined;
    const retryAfter = parseRetryAfter(response.headers);
    const message =
      messageForStatus(response.status, retryAfter) ?? (typeof body?.detail === "string" ? body.detail : "No pudimos cargar los datos.");
    throw new ServiceError(response.status === 404 ? "not_found" : "api_error", message, { status: response.status, retryAfter });
  }
  return (await response.json()) as T;
}
