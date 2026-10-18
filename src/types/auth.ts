// Tipos de autenticación. Los nombres de campos (snake_case) replican los
// esquemas Pydantic que expondrá FastAPI, para no tener que mapearlos.

export const ROLES = ["analista", "gerente", "admin"] as const;

export type Role = (typeof ROLES)[number];

/** Roles como los guarda la base (`users.role`). */
export type ApiRole = "analyst" | "manager" | "admin";

/** Usuario que devuelve FastAPI en /auth/me y al iniciar sesión. */
export interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: ApiRole;
  organization_id: string;
  organization_name: string;
  mfa_enabled: boolean;
  last_login_at: string | null;
}

/** Usuario en el portal: como ApiUser, con el rol en español. */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  organization_name: string;
  mfa_enabled: boolean;
  last_login_at: string | null;
}

export interface Session {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Con MFA activo, el login pide el código; sin MFA, ya trae la sesión (cookie) y el usuario. */
export type LoginResponse = { mfa_required: true; mfa_token: string } | { mfa_required: false; user: ApiUser };

export interface MfaVerifyRequest {
  mfa_token: string;
  code: string;
}

export interface MfaVerifyResponse {
  user: ApiUser;
}

export interface RegisterRequest {
  username: string;
  full_name: string;
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerifyRequest {
  email: string;
  code: string;
}

export interface PasswordResetVerifyResponse {
  reset_token: string;
}

export interface PasswordResetConfirmRequest {
  reset_token: string;
  new_password: string;
}
