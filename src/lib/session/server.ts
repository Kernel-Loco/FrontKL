import { cache } from "react";
import { cookies } from "next/headers";
import { STATUS_NETWORK, statusFromFetchFailure, withTimeout } from "@/lib/http";
import { messageForStatus, ServiceError } from "@/services/errors";
import type { Session } from "@/types";
import { checkSession } from "./check";
import { SESSION_COOKIE, toUser } from "./shared";

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/**
 * Sesión de quien hace la petición, validada por FastAPI (GET /auth/me reenviando la cookie).
 * Una vez por petición: layout y página comparten el resultado.
 *
 * null solo sin cookie o si FastAPI responde 401 o 403. Si la API no responde en 15 s, falla o
 * responde otro error, lanza un ServiceError: la sesión puede seguir viva, así que no se borra la cookie
 * ni se manda a /auth/expirada (#108, RC-225).
 */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await checkSession(
    () =>
      fetch(`${API_INTERNAL_URL}/api/v1/auth/me`, {
        headers: { Cookie: `${SESSION_COOKIE}=${token}`, Accept: "application/json" },
        cache: "no-store",
        signal: withTimeout(),
      }),
    (error) => statusFromFetchFailure(error),
  );
  if (result.kind === "rejected") return null;
  if (result.kind === "unavailable") {
    // Sin red desde el servidor es la API la que no responde, no la red de quien usa el portal.
    const status = result.status === STATUS_NETWORK ? 503 : result.status;
    const message = messageForStatus(status) ?? messageForStatus(503)!;
    throw new ServiceError("service_unavailable", message, { status });
  }
  return { user: toUser(result.user) };
});
