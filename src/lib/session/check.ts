// Decide qué pasó con GET /auth/me. Sin imports de valores, para que src/lib/session/check.test.mjs
// lo cargue directo con Node.
import type { ApiUser } from "@/types";

export type SessionCheck =
  | { kind: "valid"; user: ApiUser }
  /** FastAPI ya no reconoce la sesión: se borra la cookie y se vuelve al login. */
  | { kind: "rejected" }
  /** La API no respondió bien: la sesión puede seguir viva y la cookie no se toca (#108, RC-225). */
  | { kind: "unavailable"; status: number };

/** Solo 401 y 403 dicen que la sesión terminó. Un 5xx, un 429 o un fallo de red son del servicio. */
export function isSessionRejected(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * `request` hace la petición (con su tope de tiempo). `failureStatus` convierte un fallo sin respuesta
 * en un status sintético (0 sin red, 504 tiempo agotado, como statusFromFetchFailure de src/lib/http.ts).
 */
export async function checkSession(request: () => Promise<Response>, failureStatus: (error: unknown) => number): Promise<SessionCheck> {
  let response: Response;
  try {
    response = await request();
  } catch (error) {
    return { kind: "unavailable", status: failureStatus(error) };
  }
  if (isSessionRejected(response.status)) return { kind: "rejected" };
  if (!response.ok) return { kind: "unavailable", status: response.status };
  try {
    return { kind: "valid", user: (await response.json()) as ApiUser };
  } catch (error) {
    // Cuerpo que no es JSON: respuesta mala de la API. Si el tope de tiempo cortó la lectura, cuenta como tal.
    return { kind: "unavailable", status: error instanceof SyntaxError ? 502 : failureStatus(error) };
  }
}
