// Reportes. El ejecutivo (#45, RC-70) y el técnico (#46, RC-81) del dominio vienen de la API. La lista de reportes guardados sigue
// provisional: aún no está en el contrato #21.
import { mockDelay } from "@/lib/mock";
import { mockReports } from "@/mocks/api/provisional";
import type { ListResponse, Report } from "@/types";
import { downloadExport } from "./exportService";

export async function getReports(): Promise<ListResponse<Report>> {
  // TODO: conectar con backend → GET /reports
  await mockDelay(300);
  return structuredClone(mockReports);
}

/** El reporte ejecutivo del estado actual en HTML (GET /domains/{fqdn}/report?formato=html), como archivo. De este
 * mismo HTML sale el PDF (src/lib/imprimirReporte.ts, RC-70 punto 4). 403 sin autorización vigente. */
export function downloadExecutiveHtml(domain: string, signal?: AbortSignal): Promise<Blob> {
  return downloadExport(`/domains/${encodeURIComponent(domain)}/report`, "html", signal);
}

/** El reporte técnico (#46, RC-81) en HTML (GET /domains/{fqdn}/report/technical?formato=html), como archivo. De este
 * mismo HTML sale su PDF, como el ejecutivo. 403 al gerente (LEE_HALLAZGOS) y sin autorización vigente. */
export function downloadTechnicalHtml(domain: string, signal?: AbortSignal): Promise<Blob> {
  return downloadExport(`/domains/${encodeURIComponent(domain)}/report/technical`, "html", signal);
}
