// Activos nuevos desde el último escaneo (#102, RC-219). Usa la misma regla que la API para new_assets del histórico
// (cirdan/api/v1.py, score_history): un activo es nuevo en un escaneo si su first_seen_at cae entre el queued_at y el
// finished_at de ese escaneo. Un certificado es nuevo si su 'emitido' (not_before del más reciente, que ct_logs guarda
// en los atributos del dominio o del subdominio) es posterior al inicio del escaneo anterior que sí corrió.
// Sin imports con @/ de valores, así node --test lo carga.
import type { Asset, Scan } from "@/types";

/** El último escaneo terminado del dominio y el anterior que no falló (uno fallido no vio nada: no sirve de base). */
export interface ScanBase {
  last: Scan | null;
  previous: Scan | null;
  /** true si entre los escaneos leídos no hay uno anterior y la API dice que no hay más que leer. */
  firstScan: boolean;
  /** true si no hay anterior entre los leídos pero la API tiene más (total mayor que los leídos): no se sabe. */
  unknown: boolean;
}

/** `scans` va del más nuevo al más viejo, como GET /scans. Solo cuenta los de `fqdn`. */
export function scanBase(scans: Scan[], fqdn: string, total = scans.length): ScanBase {
  const finished = scans.filter((s) => s.domain === fqdn && s.finished_at);
  const last = finished[0] ?? null;
  const previous = finished.slice(1).find((s) => s.status !== "failed") ?? null;
  const more = total > scans.length;
  return { last, previous, firstScan: last !== null && previous === null && !more, unknown: last !== null && previous === null && more };
}

const time = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
};

/** El activo apareció en `scan`: first_seen_at entre su queued_at y su finished_at, como new_assets de la API. */
export function isNewAsset(asset: Pick<Asset, "first_seen_at">, scan: Scan | null): boolean {
  const seen = time(asset.first_seen_at);
  const start = time(scan?.queued_at);
  const end = time(scan?.finished_at);
  return seen !== null && start !== null && end !== null && seen >= start && seen <= end;
}

/**
 * El certificado más reciente del nombre se emitió después del inicio del escaneo anterior y a más tardar al cerrar el
 * último: ese escaneo fue el primero que pudo verlo. Solo los nombres que trae ct_logs (dominio y subdominios).
 */
export function hasNewCertificate(asset: Pick<Asset, "type" | "attributes">, base: Pick<ScanBase, "last" | "previous">): boolean {
  if (asset.type !== "domain" && asset.type !== "subdomain") return false;
  const issued = time(asset.attributes?.emitido);
  const start = time(base.previous?.queued_at);
  const end = time(base.last?.finished_at);
  return issued !== null && start !== null && end !== null && issued > start && issued <= end;
}

export interface NewAssetCounts {
  subdomains: number;
  ips: number;
  ports: number;
  certificates: number;
}

/**
 * Lo que dejó el último escaneo. `null` en el primer escaneo, si no se sabe cuál fue el anterior o si el último
 * falló (no revisó nada). Un activo de tipo 'certificate' nuevo también cuenta como certificado.
 */
export function newAssetCounts(assets: Asset[], base: ScanBase): NewAssetCounts | null {
  if (!base.last || !base.previous || base.last.status === "failed") return null;
  const counts: NewAssetCounts = { subdomains: 0, ips: 0, ports: 0, certificates: 0 };
  for (const asset of assets) {
    const fresh = isNewAsset(asset, base.last);
    if (fresh && asset.type === "subdomain") counts.subdomains += 1;
    if (fresh && asset.type === "ip") counts.ips += 1;
    if (fresh && asset.type === "service") counts.ports += 1;
    if ((fresh && asset.type === "certificate") || hasNewCertificate(asset, base)) counts.certificates += 1;
  }
  return counts;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto del panel: '2 subdominios · 1 IP · 0 puertos · 1 certificado'. */
export function newAssetsText(counts: NewAssetCounts): string {
  return [
    plural(counts.subdomains, "subdominio", "subdominios"),
    plural(counts.ips, "IP", "IP"),
    plural(counts.ports, "puerto", "puertos"),
    plural(counts.certificates, "certificado", "certificados"),
  ].join(" · ");
}
