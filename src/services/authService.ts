// Inicio de sesión contra FastAPI (/api/v1/auth, #25 y RC-5). La sesión es una cookie httpOnly
// que emite la API al verificar el MFA: este módulo nunca ve ni guarda su valor.
// Se usa desde componentes de cliente.
import { apiClient, ApiError } from "@/lib/apiClient";
import { toUser } from "@/lib/session/shared";
import type {
  ApiUser,
  LoginLinkRedeemRequest,
  LoginLinkRequest,
  LoginLinkRequestResponse,
  LoginRequest,
  LoginResponse,
  MfaEnableRequest,
  MfaEnableResponse,
  MfaEnrollEnableRequest,
  MfaEnrollSetupRequest,
  MfaSetupRequest,
  MfaSetupResponse,
  MfaVerifyRequest,
  MfaVerifyResponse,
  Passkey,
  PasskeyList,
  PasskeyLoginOptionsResponse,
  PasskeyLoginVerifyRequest,
  PasskeyRegisterOptionsRequest,
  PasskeyRegisterOptionsResponse,
  PasskeyRegisterVerifyRequest,
  PasswordChangeRequest,
  PasswordChangeResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  RegisterRequest,
  User,
} from "@/types";
import { ServiceError } from "./errors";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>("/auth/login", payload);
}

/** Pide el enlace para entrar por correo (#28, RC-63). La API responde igual exista o no la cuenta. */
export async function requestLoginLink(payload: LoginLinkRequest): Promise<LoginLinkRequestResponse> {
  return apiClient.post<LoginLinkRequestResponse>("/auth/link/request", payload);
}

/** Canjea el token del enlace por la sesión; con MFA devuelve el mfa_token, como el login. */
export async function redeemLoginLink(payload: LoginLinkRedeemRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>("/auth/link/verify", payload);
}

export async function verifyMfa(payload: MfaVerifyRequest): Promise<MfaVerifyResponse> {
  return apiClient.post<MfaVerifyResponse>("/auth/mfa/verify", payload);
}

/** Alta de TOTP desde el perfil (RC-154): con la contraseña actual devuelve el QR de un secreto nuevo. */
export async function startMfaSetup(payload: MfaSetupRequest): Promise<MfaSetupResponse> {
  return apiClient.post<MfaSetupResponse>("/auth/mfa/setup", payload);
}

/** Guarda el secreto del alta solo si el código de la app es válido. */
export async function enableMfa(payload: MfaEnableRequest): Promise<MfaEnableResponse> {
  return apiClient.post<MfaEnableResponse>("/auth/mfa/enable", payload);
}

/** Alta de TOTP al entrar (RC-5): con el token del 403 de /auth/login, la API devuelve el QR. Sin sesión. */
export async function startMfaEnroll(payload: MfaEnrollSetupRequest): Promise<MfaSetupResponse> {
  return apiClient.post<MfaSetupResponse>("/auth/mfa/enroll/setup", payload);
}

/** Activa el TOTP del alta al entrar. Con el primer código válido la API guarda el secreto y crea la sesión. */
export async function enableMfaEnroll(payload: MfaEnrollEnableRequest): Promise<MfaVerifyResponse> {
  return apiClient.post<MfaVerifyResponse>("/auth/mfa/enroll/enable", payload);
}

// --- Passkeys (RC-331). Las opciones y las respuestas de WebAuthn viajan como JSON sin tocarlas.

export async function passkeyLoginOptions(): Promise<PasskeyLoginOptionsResponse> {
  return apiClient.post<PasskeyLoginOptionsResponse>("/auth/passkeys/login/options");
}

/** Revisa la firma de la passkey y, si sirve, la API crea la sesión (cookie). La passkey cuenta como MFA. */
export async function passkeyLoginVerify(payload: PasskeyLoginVerifyRequest): Promise<MfaVerifyResponse> {
  return apiClient.post<MfaVerifyResponse>("/auth/passkeys/login/verify", payload);
}

export async function passkeyRegisterOptions(payload: PasskeyRegisterOptionsRequest): Promise<PasskeyRegisterOptionsResponse> {
  return apiClient.post<PasskeyRegisterOptionsResponse>("/auth/passkeys/register/options", payload);
}

export async function passkeyRegisterVerify(payload: PasskeyRegisterVerifyRequest): Promise<Passkey> {
  return apiClient.post<Passkey>("/auth/passkeys/register/verify", payload);
}

export async function listPasskeys(): Promise<PasskeyList> {
  return apiClient.get<PasskeyList>("/auth/passkeys");
}

export async function deletePasskey(id: string): Promise<void> {
  await apiClient.delete<void>(`/auth/passkeys/${encodeURIComponent(id)}`);
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout");
  } catch {
    // Aunque la API no responda, el portal sale; la sesión expira sola en el servidor.
  }
}

/**
 * Usuario de la sesión, o null si terminó. Renueva la inactividad en el servidor. Con `passive`, la consulta no cuenta
 * como actividad del usuario en el portal (RC-311).
 */
export async function getCurrentUser({ passive = false }: { passive?: boolean } = {}): Promise<User | null> {
  try {
    return toUser(await apiClient.get<ApiUser>("/auth/me", { passive }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** Cambia la contraseña. La API borra las passkeys de la cuenta y dice cuántas (RC-331). */
export async function changePassword(payload: PasswordChangeRequest): Promise<PasswordChangeResponse> {
  return apiClient.post<PasswordChangeResponse>("/auth/password", payload);
}

/** Pide el enlace para recuperar la contraseña (RC-335). La respuesta es la misma exista o no la cuenta. */
export async function requestPasswordReset(payload: PasswordResetRequest): Promise<PasswordResetRequestResponse> {
  return apiClient.post<PasswordResetRequestResponse>("/auth/password-reset", payload);
}

/** Canjea el token del enlace por la contraseña nueva. La API gasta el token antes de revisar la contraseña. */
export async function resetPassword(payload: PasswordResetConfirmRequest): Promise<PasswordResetConfirmResponse> {
  return apiClient.post<PasswordResetConfirmResponse>("/auth/password-reset/confirm", payload);
}

// --- Aún sin backend: las cuentas las crea un Administrador.

const NO_SIGNUP = "El registro abierto no está disponible: un Administrador te invita desde «Usuarios y roles».";

export async function register(payload: RegisterRequest): Promise<User> {
  // TODO: invitaciones de usuarios (POST /users/invitations) en lugar de registro abierto.
  void payload;
  throw new ServiceError("signup_disabled", NO_SIGNUP);
}

