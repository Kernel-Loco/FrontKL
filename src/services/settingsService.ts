// Políticas de alerta de la organización (provisional: aún no está en el contrato #21). Solo Admin.
import { mockDelay } from "@/lib/mock";
import { mockAlertPolicies, mockSettings } from "@/mocks/api/provisional";
import type { AlertPolicies, OrgSettings } from "@/types";
import { ServiceError } from "./errors";

export async function getSettings(): Promise<OrgSettings> {
  // TODO: conectar con backend → GET /settings
  await mockDelay(250);
  return structuredClone(mockSettings);
}

export async function getAlertPolicies(): Promise<AlertPolicies> {
  // TODO: conectar con backend → GET /alert-policies
  await mockDelay(250);
  return structuredClone(mockAlertPolicies);
}

export async function updateAlertPolicies(policies: AlertPolicies): Promise<AlertPolicies> {
  // TODO: conectar con backend → PUT /alert-policies
  await mockDelay(500);
  const threshold = policies.alert_score_threshold;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
    throw new ServiceError("invalid", "El umbral debe ser un número entero de 0 a 100.");
  }
  return structuredClone(policies);
}
