// Inicio de sesión contra FastAPI (/api/v1/auth, #25 y RC-5). La sesión es una cookie httpOnly
// que emite la API al verificar el MFA: este módulo nunca ve ni guarda su valor.
// Se usa desde componentes de cliente.
import { apiClient, ApiError } from "@/lib/apiClient";
import { toUser } from "@/lib/session/shared";
import type {
  ApiUser,
  LoginRequest,
  LoginResponse,
  MfaEnableRequest,
  MfaEnableResponse,
  MfaSetupRequest,
  MfaSetupResponse,
  MfaVerifyRequest,
  MfaVerifyResponse,
  PasswordChangeRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PasswordResetVerifyRequest,
  PasswordResetVerifyResponse,
  User,
} from "@/types";
import { ServiceError } from "./errors";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>("/auth/login", payload);
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

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout");
  } catch {
    // Aunque la API no responda, el portal sale; la sesión expira sola en el servidor.
  }
}

/** Usuario de la sesión, o null si terminó. Renueva la inactividad en el servidor. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return toUser(await apiClient.get<ApiUser>("/auth/me"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function changePassword(payload: PasswordChangeRequest): Promise<void> {
  await apiClient.post<void>("/auth/password", payload);
}

// --- Aún sin backend: la recuperación por correo llega después. El login ya no la enlaza; las
// pantallas de /forgot-password quedan para cuando exista POST /auth/password-reset.

const NO_RESET = "La recuperación por correo todavía no está disponible. Pide a un Administrador que restablezca tu contraseña.";

export async function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  // TODO: conectar con backend → POST /auth/password-reset (responde igual exista o no el correo).
  void payload;
  throw new ServiceError("reset_disabled", NO_RESET);
}

export async function verifyResetCode(payload: PasswordResetVerifyRequest): Promise<PasswordResetVerifyResponse> {
  void payload;
  throw new ServiceError("reset_disabled", NO_RESET);
}

export async function resetPassword(payload: PasswordResetConfirmRequest): Promise<void> {
  void payload;
  throw new ServiceError("reset_disabled", NO_RESET);
}
