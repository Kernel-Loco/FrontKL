// Reportes PDF/HTML (provisional: aún no está en el contrato #21).
import { mockDelay } from "@/lib/mock";
import { mockReports } from "@/mocks/api/provisional";
import type { ListResponse, Report, ReportRequest } from "@/types";

export async function getReports(): Promise<ListResponse<Report>> {
  // TODO: conectar con backend → GET /reports
  await mockDelay(300);
  return structuredClone(mockReports);
}

/** Pide generar un reporte. Queda en `pending` hasta que el backend lo genere. */
export async function requestReport(request: ReportRequest): Promise<Report> {
  // TODO: conectar con backend → POST /reports
  await mockDelay(600);
  return {
    id: `report-${Date.now()}`,
    kind: request.format === "pdf" ? "pdf_report" : "html_report",
    domain: request.domain,
    period_start: request.period_start,
    period_end: request.period_end,
    status: "pending",
    generated_at: null,
    download_url: null,
  };
}
