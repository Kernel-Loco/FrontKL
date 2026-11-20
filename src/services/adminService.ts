// Webhooks y bitácora provisionales. Solo Admin.
import { mockDelay } from "@/lib/mock";
import { mockAuditLog, mockSettings } from "@/mocks/api/provisional";
import type { AuditEntry, Integration, IntegrationRequest, ListResponse } from "@/types";
import { ServiceError } from "./errors";

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
