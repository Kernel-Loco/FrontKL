// Sesión real: FastAPI la emite como cookie httpOnly al verificar el MFA y la guarda en Valkey.
// El portal nunca puede leer ni escribir su valor desde JavaScript; solo sabe si existe.
import type { ApiRole, ApiUser, Role, User } from "@/types";

export const SESSION_COOKIE = "lt_session";

const ROLE_FROM_API: Record<ApiRole, Role> = { analyst: "analista", manager: "gerente", admin: "admin" };

export function toUser(user: ApiUser): User {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: ROLE_FROM_API[user.role],
    organization_name: user.organization_name,
    mfa_enabled: user.mfa_enabled,
    last_login_at: user.last_login_at,
  };
}
