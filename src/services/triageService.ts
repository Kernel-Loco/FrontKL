import { apiClient } from "@/lib/apiClient";
import type { TriageRequest, TriageResult } from "@/types";

/** Cambia el estado de un hallazgo (RC-133). Solo Analista y Admin; la API deja quién y cuándo en la bitácora. */
export function triageFinding(findingId: string, body: TriageRequest) {
  return apiClient.post<TriageResult>(`/findings/${encodeURIComponent(findingId)}/triage`, body);
}
