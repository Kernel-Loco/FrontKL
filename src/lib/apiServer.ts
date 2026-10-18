// Lecturas a FastAPI desde el servidor de Next (Server Components). Reenvía la cookie de sesión
// de quien hizo la petición, así RLS filtra por su empresa. Nunca importar desde el navegador.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ServiceError } from "@/services/errors";
import { SESSION_COOKIE } from "./session/shared";

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export async function apiGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const response = await fetch(`${API_INTERNAL_URL}/api/v1${path}`, {
    headers: { Accept: "application/json", ...(token && { Cookie: `${SESSION_COOKIE}=${token}` }) },
    cache: "no-store",
  });
  // La sesión expiró en el servidor: se borra la cookie y vuelve al login.
  if (response.status === 401) redirect("/auth/expirada");
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { detail?: unknown } | undefined;
    const message = typeof body?.detail === "string" ? body.detail : "No pudimos cargar los datos.";
    throw new ServiceError(response.status === 404 ? "not_found" : "api_error", message);
  }
  return (await response.json()) as T;
}
