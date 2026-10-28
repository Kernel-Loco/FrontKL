import { apiClient, ApiError } from "@/lib/apiClient";
import type { ActionPlanSimulation } from "@/types";

export type PlanExportFormat = "csv" | "json";

export function simulateActionPlan(domain: string, actionIds: string[], signal?: AbortSignal) {
  return apiClient.post<ActionPlanSimulation>(
    `/domains/${encodeURIComponent(domain)}/action-plan/simulate`,
    { action_ids: actionIds },
    { signal },
  );
}

export async function downloadActionPlan(domain: string, format: PlanExportFormat): Promise<Blob> {
  const response = await fetch(
    `/api/v1/domains/${encodeURIComponent(domain)}/action-plan/export?formato=${format}`,
    { credentials: "same-origin", headers: { Accept: format === "csv" ? "text/csv" : "application/json" } },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    const message = body && typeof body.detail === "string" ? body.detail : response.statusText;
    throw new ApiError(response.status, message, body);
  }
  return response.blob();
}