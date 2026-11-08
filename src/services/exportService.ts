import { ApiError, apiErrorFromResponse } from "@/lib/apiClient";
import { statusFromFetchFailure, withTimeout } from "@/lib/http";

export type ExportFormat = "csv" | "json";

/**
 * Descarga una exportación de la API (#24): CSV con BOM y celdas escapadas, o JSON.
 * La API responde 403 si el dominio no tiene una autorización firmada vigente.
 * `path` va sin /api/v1 y ya con su query, sin `formato`.
 */
export async function downloadExport(path: string, format: ExportFormat, signal?: AbortSignal): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}${path.includes("?") ? "&" : "?"}formato=${format}`, {
      credentials: "same-origin",
      headers: { Accept: format === "csv" ? "text/csv" : "application/json" },
      signal: withTimeout(signal),
    });
  } catch (error) {
    throw new ApiError(statusFromFetchFailure(error, signal), "Sin conexión con el servicio.");
  }
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.blob();
}

/** Hallazgos abiertos del dominio desde GET /domains/{fqdn}/findings/export. */
export function downloadFindings(domain: string, format: ExportFormat, signal?: AbortSignal) {
  return downloadExport(`/domains/${encodeURIComponent(domain)}/findings/export`, format, signal);
}
