// Formato de la cookie de sesión mock, compartido por proxy, servidor y cliente.
import { ROLES, type Session } from "@/types";

export const SESSION_COOKIE = "cirdan_session";

export function serializeSession(session: Session): string {
  return JSON.stringify(session);
}

/** Recibe el valor ya decodificado de la cookie y valida su forma. */
export function parseSession(value: string | null | undefined): Session | null {
  if (!value) return null;
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object" || !("user" in data)) return null;
    const user = (data as Session).user;
    if (
      typeof user?.id !== "string" ||
      typeof user.username !== "string" ||
      typeof user.full_name !== "string" ||
      typeof user.email !== "string" ||
      !ROLES.includes(user.role)
    ) {
      return null;
    }
    return { user };
  } catch {
    return null;
  }
}
