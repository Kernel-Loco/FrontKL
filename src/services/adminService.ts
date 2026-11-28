// Llaves de API, webhooks y bitácora (provisional: aún no está en el contrato #21). Solo Admin.
// Se usa desde el servidor (listas) y desde componentes de cliente (crear, revocar, activar).
import { PREFIJO_FALSO } from "@/config/simulado";
import { mockDelay } from "@/lib/mock";
import { mockAuditLog, mockSettings } from "@/mocks/api/provisional";
import type { ApiKey, ApiKeyCreated, ApiKeyRequest, AuditEntry, Integration, IntegrationRequest, ListResponse } from "@/types";
import { ServiceError } from "./errors";
import { tx } from "@/i18n/tx";

export const API_KEY_MAX_DAYS = 90;
export const API_KEY_OWN_USE_ERROR = "Confirma que la llave es solo para los sistemas de tu propia empresa.";
export const API_SCOPES = ["findings:read", "scores:read", "domains:read", "reports:read", "scans:write"] as const;

export async function getApiKeys(): Promise<ListResponse<ApiKey>> {
  // TODO: conectar con backend → GET /api-keys
  await mockDelay(250);
  return { items: structuredClone(mockSettings.api_keys), total: mockSettings.api_keys.length };
}

export async function createApiKey(request: ApiKeyRequest): Promise<ApiKeyCreated> {
  // TODO: conectar con backend → POST /api-keys
  await mockDelay(600);
  if (request.own_use !== true) throw new ServiceError("invalid", tx(API_KEY_OWN_USE_ERROR));
  if (!request.name.trim()) throw new ServiceError("invalid", tx("Ponle un nombre a la llave."));
  if (request.scopes.length === 0) throw new ServiceError("invalid", tx("Elige al menos un permiso."));
  if (request.expires_in_days < 1 || request.expires_in_days > API_KEY_MAX_DAYS) {
    throw new ServiceError("invalid", tx("La vigencia va de 1 a {0} días.", API_KEY_MAX_DAYS));
  }
  const random = crypto.randomUUID().replace(/-/g, "");
  const now = new Date();
  const expires = new Date(now.getTime() + request.expires_in_days * 86_400_000);
  return {
    secret: `${PREFIJO_FALSO}${random}`,
    api_key: {
      id: crypto.randomUUID(),
      name: request.name.trim(),
      key_prefix: `${PREFIJO_FALSO}${random.slice(0, 4)}`,
      scopes: request.scopes,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      last_used_at: null,
      revoked_at: null,
    },
  };
}

export async function revokeApiKey(id: string): Promise<ApiKey> {
  // TODO: conectar con backend → DELETE /api-keys/{id}
  await mockDelay(400);
  const key = mockSettings.api_keys.find((k) => k.id === id);
  if (!key) throw new ServiceError("not_found", tx("Llave no encontrada."));
  return { ...structuredClone(key), revoked_at: new Date().toISOString() };
}

export async function getIntegrations(): Promise<ListResponse<Integration>> {
  // TODO: conectar con backend → GET /integrations
  await mockDelay(250);
  return { items: structuredClone(mockSettings.integrations), total: mockSettings.integrations.length };
}

export async function createIntegration(request: IntegrationRequest): Promise<Integration> {
  // TODO: conectar con backend → POST /integrations
  await mockDelay(600);
  if (!request.name.trim()) throw new ServiceError("invalid", tx("Ponle un nombre al webhook."));
  if (request.kind !== "email" && !/^https:\/\/[^\s]+$/.test(request.endpoint)) {
    throw new ServiceError("invalid", tx("La URL debe empezar con https://."));
  }
  if (request.events.length === 0) throw new ServiceError("invalid", tx("Elige al menos un evento."));
  return { id: crypto.randomUUID(), enabled: true, ...request, name: request.name.trim() };
}

export async function setIntegrationEnabled(id: string, enabled: boolean): Promise<Integration> {
  // TODO: conectar con backend → PATCH /integrations/{id} { enabled }
  await mockDelay(300);
  const integration = mockSettings.integrations.find((i) => i.id === id);
  if (!integration) throw new ServiceError("not_found", tx("Webhook no encontrado."));
  return { ...structuredClone(integration), enabled };
}

export async function getAuditLog(): Promise<ListResponse<AuditEntry>> {
  // TODO: conectar con backend → GET /audit-log
  await mockDelay(250);
  return structuredClone(mockAuditLog);
}
