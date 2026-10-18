import { cache } from "react";
import { cookies } from "next/headers";
import type { ApiUser, Session } from "@/types";
import { SESSION_COOKIE, toUser } from "./shared";

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/**
 * Sesión de quien hace la petición, validada por FastAPI (GET /auth/me reenviando la cookie).
 * Una vez por petición: layout y página comparten el resultado.
 */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/v1/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return { user: toUser((await response.json()) as ApiUser) };
  } catch {
    // La API no responde: se trata como sin sesión (vuelve al login) en vez de romper la página.
    return null;
  }
});
