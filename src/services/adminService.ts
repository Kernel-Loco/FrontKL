// Llaves de API (RC-129, BackKL cirdan/api/llaves.py), webhooks y bitácora (provisional: aún no está en el
// contrato #21). Solo Admin. Estas funciones corren en el navegador: la lista de llaves se lee en el servidor
// con getApiKeys de queries.ts.
import { apiClient } from "@/lib/apiClient";
import { cuerpoDeLlave, validarLlave } from "@/lib/llavesApi";
import { mockDelay } from "@/lib/mock";
import { mockAuditLog, mockSettings } from "@/mocks/api/provisional";
import type { ApiKeyCreated, ApiKeyRequest, AuditEntry, Integration, IntegrationRequest, ListResponse } from "@/types";
import { ServiceError } from "./errors";

/** `POST /api/v1/api-keys`. La llave completa (`key`) solo viene en esta respuesta. */
export async function createApiKey(request: ApiKeyRequest): Promise<ApiKeyCreated> {
  const invalido = validarLlave(request);
  if (invalido) throw new ServiceError("invalid", invalido);
  return apiClient.post<ApiKeyCreated>("/api-keys", cuerpoDeLlave(request));
}

/** `DELETE /api/v1/api-keys/{id}`: 204 sin cuerpo. Revocar una ya revocada no cambia nada. */
export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete<void>(`/api-keys/${encodeURIComponent(id)}`);
}

export async function getIntegrations(): Promise<ListResponse<Integration>> {
  // TODO: conectar con backend → GET /integrations
  await mockDelay(250);
  return { items: structuredClone(mockSettings.integrations), total: mockSettings.integrations.length };
}

export async function createIntegration(request: IntegrationRequest): Promise<Integration> {
  // TODO: conectar con backend → POST /integrations
  await mockDelay(600);
  if (!request.name.trim()) throw new ServiceError("invalid", "Ponle un nombre al webhook.");
  if (request.kind !== "email" && !/^https:\/\/[^\s]+$/.test(request.endpoint)) {
    throw new ServiceError("invalid", "La URL debe empezar con https://.");
  }
  if (request.events.length === 0) throw new ServiceError("invalid", "Elige al menos un evento.");
  return { id: crypto.randomUUID(), enabled: true, ...request, name: request.name.trim() };
}

export async function setIntegrationEnabled(id: string, enabled: boolean): Promise<Integration> {
  // TODO: conectar con backend → PATCH /integrations/{id} { enabled }
  await mockDelay(300);
  const integration = mockSettings.integrations.find((i) => i.id === id);
  if (!integration) throw new ServiceError("not_found", "Webhook no encontrado.");
  return { ...structuredClone(integration), enabled };
}

export async function getAuditLog(): Promise<ListResponse<AuditEntry>> {
  // TODO: conectar con backend → GET /audit-log
  await mockDelay(250);
  return structuredClone(mockAuditLog);
}
