// Tipos de autenticación. Los nombres de campos (snake_case) replican los
// esquemas Pydantic que expondrá FastAPI, para no tener que mapearlos.
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

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
  /** Segundos de inactividad que tolera el servidor (15 min hoy). Opcional hasta que /auth/me lo devuelva. */
  idle_timeout_seconds?: number;
  /** Segundos que faltan para el tope absoluto de la sesión (8 h desde el inicio). */
  absolute_expires_in_seconds?: number;
}

/** Vencimientos de la sesión según el servidor, medidos al momento de recibirlos. */
export interface SessionLimits {
  idle_timeout_seconds: number;
  absolute_expires_in_seconds: number;
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
  /** Ausente si la API aún no informa los vencimientos: el portal usa su configuración local. */
  session_limits?: SessionLimits;
}

export interface Session {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
  /** Resultado del widget ALTCHA (RC-154). Cada uno sirve para un solo intento. */
  captcha: string;
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

/** Alta de TOTP, paso 1 (POST /auth/mfa/setup, RC-154): pide la contraseña actual. */
export interface MfaSetupRequest {
  current_password: string;
}

/** Secreto nuevo que todavía no se guarda: la API lo guarda solo con un código válido en /auth/mfa/enable. */
export interface MfaSetupResponse {
  otpauth_uri: string;
  /** El mismo secreto en base32, para escribirlo a mano si la cámara no lee el QR. */
  secret: string;
  /** QR dibujado por la API, como data:image/svg+xml. */
  qr_svg: string;
  expires_in_seconds: number;
}

export interface MfaEnableRequest {
  code: string;
}

export interface MfaEnableResponse {
  mfa_enabled: true;
  /** Passkeys que la API borró al activar TOTP (RC-331): la cuenta queda con el código de la app. */
  passkeys_removed: number;
}

/** Passkey de la cuenta (GET /auth/passkeys, RC-331). La API nunca devuelve la llave pública ni el id de la credencial. */
export interface Passkey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  /** La guarda un gestor que la sincroniza entre equipos (iCloud, Google, Bitwarden...). */
  backed_up: boolean;
  transports: string[] | null;
}

export interface PasskeyList {
  passkeys: Passkey[];
  /** False si el servidor no tiene WEBAUTHN_RP_ID u orígenes que sirvan: no se pueden registrar ni usar. */
  available: boolean;
  max: number;
}

/** Registrar passkey, paso 1: la contraseña actual y, si la cuenta tiene TOTP, un código de la app. */
export interface PasskeyRegisterOptionsRequest {
  current_password: string;
  code?: string;
}

/** Las opciones de WebAuthn son JSON que la página pasa tal cual a @simplewebauthn/browser. */
export interface PasskeyRegisterOptionsResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
  expires_in_seconds: number;
}

export interface PasskeyRegisterVerifyRequest {
  credential: RegistrationResponseJSON;
  name: string;
}

export interface PasskeyLoginOptionsResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  /** Identifica el reto de un solo uso que guarda la API. Se manda de vuelta en /passkeys/login/verify. */
  login_token: string;
  expires_in_seconds: number;
}

export interface PasskeyLoginVerifyRequest {
  login_token: string;
  credential: AuthenticationResponseJSON;
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
