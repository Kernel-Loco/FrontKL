import { apiClient, ApiError, apiErrorFromResponse } from "@/lib/apiClient";
import { statusFromFetchFailure, withTimeout } from "@/lib/http";
import type { ScoreComparison } from "@/types";

export type ComparisonExportFormat = "csv" | "json";

function compareQuery(fromScoreId: string, toScoreId: string) {
  return `desde=${encodeURIComponent(fromScoreId)}&hasta=${encodeURIComponent(toScoreId)}`;
}

/** Compara hallazgo por hallazgo dos puntos del histórico (#24). La API responde 403 sin autorización vigente. */
export function compareScores(domain: string, fromScoreId: string, toScoreId: string, signal?: AbortSignal) {
  return apiClient.get<ScoreComparison>(
    `/domains/${encodeURIComponent(domain)}/score/compare?${compareQuery(fromScoreId, toScoreId)}`,
    { signal },
  );
}

/** Descarga la comparación desde la API: CSV con BOM y celdas escapadas, o JSON. */
export async function downloadComparison(
  domain: string,
  fromScoreId: string,
  toScoreId: string,
  format: ComparisonExportFormat,
): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(
      `/api/v1/domains/${encodeURIComponent(domain)}/score/compare/export?formato=${format}&${compareQuery(fromScoreId, toScoreId)}`,
      {
        credentials: "same-origin",
        headers: { Accept: format === "csv" ? "text/csv" : "application/json" },
        signal: withTimeout(),
      },
    );
  } catch (error) {
    throw new ApiError(statusFromFetchFailure(error), "Sin conexión con el servicio.");
  }
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.blob();
}
