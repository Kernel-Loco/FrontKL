import { apiClient, ApiError, apiErrorFromResponse } from "@/lib/apiClient";
import { statusFromFetchFailure, withTimeout } from "@/lib/http";
import type { ActionPlanSimulation, PlanGrouping } from "@/types";

export type PlanExportFormat = "csv" | "json";

export function simulateActionPlan(domain: string, actionIds: string[], signal?: AbortSignal) {
  return apiClient.post<ActionPlanSimulation>(
    `/domains/${encodeURIComponent(domain)}/action-plan/simulate`,
    { action_ids: actionIds },
    { signal },
  );
}

export async function downloadActionPlan(
  domain: string,
  format: PlanExportFormat,
  agrupar: PlanGrouping = "regla",
): Promise<Blob> {
  const query = new URLSearchParams({ formato: format });
  if (agrupar === "activo") query.set("agrupar", "activo");
  let response: Response;
  try {
    response = await fetch(`/api/v1/domains/${encodeURIComponent(domain)}/action-plan/export?${query}`, {
      credentials: "same-origin",
      headers: { Accept: format === "csv" ? "text/csv" : "application/json" },
      signal: withTimeout(),
    });
  } catch (error) {
    throw new ApiError(statusFromFetchFailure(error), "Sin conexión con el servicio.");
  }
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.blob();
}