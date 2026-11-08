import { apiClient } from "@/lib/apiClient";
import type { ScoreComparison } from "@/types";
import { downloadExport, type ExportFormat } from "./exportService";

export type ComparisonExportFormat = ExportFormat;

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
export function downloadComparison(
  domain: string,
  fromScoreId: string,
  toScoreId: string,
  format: ComparisonExportFormat,
  signal?: AbortSignal,
): Promise<Blob> {
  return downloadExport(
    `/domains/${encodeURIComponent(domain)}/score/compare/export?${compareQuery(fromScoreId, toScoreId)}`,
    format,
    signal,
  );
}
