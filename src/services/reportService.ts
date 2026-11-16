// Reportes. El ejecutivo del dominio (#45, RC-70) viene de la API. La lista de reportes guardados sigue
// provisional: aún no está en el contrato #21.
import { apiClient } from "@/lib/apiClient";
import { mockDelay } from "@/lib/mock";
import { mockReports } from "@/mocks/api/provisional";
import type { ExecutiveReport, ListResponse, Report } from "@/types";
import { downloadExport } from "./exportService";

export async function getReports(): Promise<ListResponse<Report>> {
  // TODO: conectar con backend → GET /reports
  await mockDelay(300);
  return structuredClone(mockReports);
}

/** GET /domains/{fqdn}/report: el reporte ejecutivo del estado actual, para armar el PDF. 403 sin autorización vigente. */
export function getExecutiveReport(domain: string, signal?: AbortSignal): Promise<ExecutiveReport> {
  return apiClient.get<ExecutiveReport>(`/domains/${encodeURIComponent(domain)}/report`, { signal });
}

/** El mismo reporte en HTML (GET /domains/{fqdn}/report?formato=html), como archivo. */
export function downloadExecutiveHtml(domain: string, signal?: AbortSignal): Promise<Blob> {
  return downloadExport(`/domains/${encodeURIComponent(domain)}/report`, "html", signal);
}
