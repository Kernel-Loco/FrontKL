// Capa de autenticación. Hoy devuelve datos mock; cada función indica con un
// TODO el endpoint de FastAPI que la reemplazará (vía `apiClient`).
// Se usa desde componentes de cliente.
import { DEFAULT_ROLE } from "@/config/permissions";
import { mockDelay } from "@/lib/mock";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "@/lib/session/client";
import { MOCK_MFA_CODE, MOCK_RESET_CODE, mockAccounts } from "@/mocks/users";
import type {
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  MfaVerifyResponse,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PasswordResetVerifyRequest,
  PasswordResetVerifyResponse,
  RegisterRequest,
  User,
} from "@/types";
import { ServiceError } from "./errors";

const MFA_TOKEN_PREFIX = "mock-mfa.";
const RESET_TOKEN_PREFIX = "mock-reset.";

/** Mismo mensaje exista o no el usuario, para no permitir enumerarlos. */
const INVALID_CREDENTIALS = "Usuario o contraseña incorrectos.";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  // TODO: conectar con backend → return apiClient.post<LoginResponse>("/auth/login", payload);
  await mockDelay();
  const account = mockAccounts.find(
    (a) => a.user.username.toLowerCase() === payload.username.trim().toLowerCase(),
  );
  if (!account || account.password !== payload.password) {
    throw new ServiceError("invalid_credentials", INVALID_CREDENTIALS);
  }
  return { mfa_required: true, mfa_token: `${MFA_TOKEN_PREFIX}${account.user.id}` };
}

export async function verifyMfa(payload: MfaVerifyRequest): Promise<MfaVerifyResponse> {
  // TODO: conectar con backend → apiClient.post<MfaVerifyResponse>("/auth/mfa/verify", payload);
  // FastAPI responderá con Set-Cookie (httpOnly, Secure, SameSite) y el frontend no tocará la cookie.
  await mockDelay();
  const userId = payload.mfa_token.startsWith(MFA_TOKEN_PREFIX) ? payload.mfa_token.slice(MFA_TOKEN_PREFIX.length) : "";
  const account = mockAccounts.find((a) => a.user.id === userId);
  if (!account) {
    throw new ServiceError("mfa_expired", "Tu verificación expiró. Inicia sesión de nuevo.");
  }
  if (payload.code !== MOCK_MFA_CODE) {
    throw new ServiceError("invalid_mfa_code", "El código no es válido o ya expiró.");
  }
  setSessionCookie({ user: account.user });
  return { user: account.user };
}

export async function register(payload: RegisterRequest): Promise<User> {
  // TODO: conectar con backend → return apiClient.post<User>("/auth/register", payload);
  // El rol lo asigna FastAPI (Analista por defecto); el frontend nunca lo envía.
  await mockDelay();
  const taken = mockAccounts.some(
    (a) =>
      a.user.username.toLowerCase() === payload.username.toLowerCase() ||
      a.user.email.toLowerCase() === payload.email.toLowerCase(),
  );
  if (taken) {
    throw new ServiceError("registration_failed", "No pudimos crear la cuenta con esos datos. Revisa el usuario y el e-mail.");
  }
  const user: User = {
    id: `u-${crypto.randomUUID().slice(0, 8)}`,
    username: payload.username,
    full_name: payload.full_name,
    email: payload.email,
    role: DEFAULT_ROLE,
  };
  mockAccounts.push({ user, password: payload.password });
  return user;
}

export async function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  // TODO: conectar con backend → await apiClient.post<void>("/auth/password-reset", payload);
  // Responde igual exista o no el e-mail, para no permitir enumerar cuentas.
  void payload;
  await mockDelay();
}

export async function verifyResetCode(payload: PasswordResetVerifyRequest): Promise<PasswordResetVerifyResponse> {
  // TODO: conectar con backend → return apiClient.post<PasswordResetVerifyResponse>("/auth/password-reset/verify", payload);
  await mockDelay();
  if (payload.code !== MOCK_RESET_CODE) {
    throw new ServiceError("invalid_reset_code", "El código no es válido o ya expiró.");
  }
  return { reset_token: `${RESET_TOKEN_PREFIX}${payload.email}` };
}

export async function resetPassword(payload: PasswordResetConfirmRequest): Promise<void> {
  // TODO: conectar con backend → await apiClient.post<void>("/auth/password-reset/confirm", payload);
  await mockDelay();
  if (!payload.reset_token.startsWith(RESET_TOKEN_PREFIX)) {
    throw new ServiceError("reset_expired", "La solicitud expiró. Vuelve a pedir un código.");
  }
  const email = payload.reset_token.slice(RESET_TOKEN_PREFIX.length).toLowerCase();
  const account = mockAccounts.find((a) => a.user.email.toLowerCase() === email);
  if (account) account.password = payload.new_password;
}

export async function logout(): Promise<void> {
  // TODO: conectar con backend → await apiClient.post<void>("/auth/logout");
  // FastAPI invalidará la sesión en servidor (Valkey) y borrará la cookie.
  clearSessionCookie();
  await mockDelay(200);
}

export async function getCurrentUser(): Promise<User | null> {
  // TODO: conectar con backend → return apiClient.get<User>("/auth/me") (401 → null).
  return readSessionCookie()?.user ?? null;
}
