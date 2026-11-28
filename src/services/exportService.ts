import { ApiError, apiErrorFromResponse } from "@/lib/apiClient";
import { statusFromFetchFailure, withTimeout } from "@/lib/http";
import { tx } from "@/i18n/tx";

export type ExportFormat = "csv" | "json";

const ACCEPT: Record<ExportFormat | "html", string> = { csv: "text/csv", json: "application/json", html: "text/html" };

/**
 * Descarga una exportación de la API (#24): CSV con BOM y celdas escapadas, o JSON. También el reporte ejecutivo en HTML (#45).
 * La API responde 403 si el dominio no tiene una autorización firmada vigente.
 * `path` va sin /api/v1 y ya con su query, sin `formato`.
 */
export function downloadExport(path: string, format: ExportFormat | "html", signal?: AbortSignal): Promise<Blob> {
  return fetchBlob(`/api/v1${path}${path.includes("?") ? "&" : "?"}formato=${format}`, ACCEPT[format], signal);
}

async function fetchBlob(url: string, accept: string, signal?: AbortSignal): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", headers: { Accept: accept }, signal: withTimeout(signal) });
  } catch (error) {
    throw new ApiError(statusFromFetchFailure(error, signal), tx("Sin conexión con el servicio."));
  }
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.blob();
}

/**
 * Inventario de activos de la empresa desde GET /assets?formato=csv (RC-231), con los filtros de la pantalla y sin
 * paginar. Solo trae los dominios con autorización vigente; con un dominio sin ella responde 403.
 */
export function downloadAssets(query: string, signal?: AbortSignal) {
  return downloadExport(query ? `/assets?${query}` : "/assets", "csv", signal);
}

/** Hallazgos abiertos del dominio desde GET /domains/{fqdn}/findings/export. */
export function downloadFindings(domain: string, format: ExportFormat, signal?: AbortSignal) {
  return downloadExport(`/domains/${encodeURIComponent(domain)}/findings/export`, format, signal);
}

/**
 * Salida a SIEM del dominio (GET /domains/{fqdn}/export/siem): NDJSON para el HEC de Splunk con los hallazgos abiertos,
 * el último escaneo y el último score. Pide sesión. 403 si el plan no la incluye o la empresa está suspendida, y 409 si
 * hay un escaneo en curso.
 */
export function downloadSiem(domain: string, signal?: AbortSignal): Promise<Blob> {
  return fetchBlob(`/api/v1/domains/${encodeURIComponent(domain)}/export/siem`, "application/x-ndjson", signal);
}
