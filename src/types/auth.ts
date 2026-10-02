// Tipos de autenticación. Los nombres de campos (snake_case) replican los
// esquemas Pydantic que expondrá FastAPI, para no tener que mapearlos.

export const ROLES = ["analista", "gerente", "admin"] as const;

export type Role = (typeof ROLES)[number];

/** Esquema `UserRead`. */
export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: Role;
}

export interface Session {
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

/** El login nunca entrega la sesión directamente: siempre exige el segundo factor. */
export interface LoginResponse {
  mfa_required: true;
  mfa_token: string;
}

export interface MfaVerifyRequest {
  mfa_token: string;
  code: string;
}

export interface MfaVerifyResponse {
  user: User;
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
