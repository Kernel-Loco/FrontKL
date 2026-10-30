// Pedir un escaneo desde el navegador (botón «Escanear ahora», #22). La lista de escaneos de las
// páginas está en queries.ts.
import { apiClient, ApiError } from "@/lib/apiClient";
import type { Scan, ScanBlockReason, ScanRequestResult } from "@/types";

interface ApiScan {
  id: string;
  domain: string;
  trigger: Scan["trigger"];
  status: Scan["status"];
  queued_at: string;
  finished_at: string | null;
  sources: Scan["sources"];
}

/** `scans.stats` tal como lo deja el orquestador al terminar (#22, #23). */
export interface ScanRunStats {
  assets: number;
  findings: number;
  sources_ok: number;
  sources_failed: number;
  rules_without_coverage?: string[];
}

export type ScanProgress = ApiScan & { stats: ScanRunStats | null };

const FINISHED: Scan["status"][] = ["completed", "partial", "failed"];

export const isScanFinished = (status: Scan["status"]) => FINISHED.includes(status);

/** Estado de un escaneo y de cada fuente, para seguirlo mientras corre. */
export const getScan = (id: string) => apiClient.get<ScanProgress>(`/scans/${encodeURIComponent(id)}`);

interface ScanRejection {
  accepted: false;
  detail: string;
  reasons: ScanBlockReason[];
}

function isRejection(body: unknown): body is ScanRejection {
  return Boolean(body && typeof body === "object" && "accepted" in body && (body as ScanRejection).accepted === false);
}

/**
 * Pide un escaneo a FastAPI (#22). Solo se acepta con autorización vigente y TXT verificado justo
 * antes; si no, devuelve `accepted: false` con el motivo para mostrarlo. Solo Analista y Admin.
 */
export async function requestScan(fqdn: string): Promise<ScanRequestResult> {
  try {
    const { scan } = await apiClient.post<{ accepted: true; scan: ApiScan }>(`/domains/${encodeURIComponent(fqdn)}/scans`);
    return { accepted: true, scan: { ...scan, stats: null } };
  } catch (error) {
    // 409 (no cumple) y 404 (no es de tu organización) traen el motivo en el cuerpo.
    if (error instanceof ApiError && isRejection(error.detail)) {
      return { accepted: false, detail: error.detail.detail, reasons: error.detail.reasons };
    }
    throw error;
  }
}
