// TODO: En producción, FastAPI emitirá la cookie de sesión como httpOnly, Secure y
// SameSite (Strict o Lax) al verificar el MFA, y la invalidará en /auth/logout.
// El frontend no podrá leerla ni escribirla desde JavaScript, y NUNCA debe guardar
// tokens de sesión en localStorage ni sessionStorage. Este módulo solo existe para
// simular esa cookie mientras no hay backend.
import { SESSION_COOKIE_MAX_AGE_S } from "@/config/session";
import type { Session } from "@/types";
import { parseSession, serializeSession, SESSION_COOKIE } from "./shared";

function writeCookie(value: string, maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function readSessionCookie(): Session | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  try {
    return parseSession(decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

export function setSessionCookie(session: Session) {
  writeCookie(serializeSession(session), SESSION_COOKIE_MAX_AGE_S);
}

/** Renueva la expiración de la cookie mientras el usuario está activo. */
export function refreshSessionCookie() {
  const session = readSessionCookie();
  if (session) setSessionCookie(session);
}

export function clearSessionCookie() {
  writeCookie("", 0);
}
