// Escaneos OSINT (provisional: aún no está en el contrato #21). Se usa desde el servidor
// (lista) y desde componentes de cliente (botón «Escanear ahora»).
import { mockDelay } from "@/lib/mock";
import { mockDomains } from "@/mocks/api/contrato";
import { mockScans } from "@/mocks/api/provisional";
import type { ListResponse, Scan, ScanRequestResult } from "@/types";
import { SCAN_BLOCK_REASON_LABELS } from "@/config/labels";
import { ServiceError } from "./errors";

export async function getScans(): Promise<ListResponse<Scan>> {
  // TODO: conectar con backend → GET /scans
  await mockDelay(300);
  return structuredClone(mockScans);
}

/**
 * Pide un escaneo. Solo se acepta con autorización vigente y TXT verificado (#22);
 * si no, devuelve `accepted: false` con el motivo para mostrarlo.
 */
export async function requestScan(fqdn: string): Promise<ScanRequestResult> {
  // TODO: conectar con backend → POST /domains/{fqdn}/scans (409 si no se puede escanear)
  await mockDelay(600);
  const domain = mockDomains.items.find((d) => d.fqdn === fqdn);
  if (!domain) throw new ServiceError("not_found", "Dominio no encontrado para esta organización");
  const { can_scan, reasons } = domain.scan_eligibility;
  if (!can_scan) {
    return {
      accepted: false,
      reasons,
      detail: `No se puede escanear: ${reasons.map((r) => SCAN_BLOCK_REASON_LABELS[r].replace(/^./, (c) => c.toLowerCase())).join(" y ")}.`,
    };
  }
  const now = new Date().toISOString();
  return {
    accepted: true,
    scan: { id: `scan-${Date.now()}`, domain: fqdn, trigger: "on_demand", status: "queued", queued_at: now, finished_at: null, stats: null, sources: [] },
  };
}
