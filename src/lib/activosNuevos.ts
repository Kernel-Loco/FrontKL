// Activos nuevos desde el último escaneo (#102, RC-219). Parte de la regla de new_assets del histórico de la API
// (cirdan/api/v1.py, score_history): un activo es nuevo si su first_seen_at cae entre el queued_at y el finished_at del
// último escaneo. Se aparta a propósito cuando hay fallidos entre el último y el anterior que sí corrió: la ventana
// empieza en el queued_at del más viejo de esos fallidos, para que lo que guardaron cuente en el siguiente (new_assets
// lo cuenta en el fallido). Un certificado es nuevo si su 'emitido' (not_before del más reciente, que ct_logs guarda
// en los atributos del dominio o del subdominio) es posterior al inicio del escaneo anterior que sí corrió.
// Sin imports con @/ de valores, así node --test lo carga.
import type { Asset, Scan } from "@/types";
import { tx } from "@/i18n/tx";

/** El último escaneo terminado del dominio y el anterior que no falló (uno fallido no vio nada: no sirve de base). */
export interface ScanBase {
  last: Scan | null;
  previous: Scan | null;
  /**
   * Inicio de la ventana de lo nuevo: el queued_at del más viejo de los terminados después de `previous` (el último y
   * los fallidos de en medio). Lo que guardó un escaneo fallido cuenta como nuevo en el siguiente que sí corrió.
   */
  since: string | null;
  /** true si el último corrió, entre los leídos no hay uno anterior que corriera y la API dice que no hay más. */
  firstScan: boolean;
  /** true si el último corrió y no hay anterior entre los leídos pero la API tiene más (total mayor que los leídos). */
  unknown: boolean;
}

/** `scans` va del más nuevo al más viejo, como GET /scans. Solo cuenta los de `fqdn`. */
export function scanBase(scans: Scan[], fqdn: string, total = scans.length): ScanBase {
  const finished = scans.filter((s) => s.domain === fqdn && s.finished_at);
  const last = finished[0] ?? null;
  const index = finished.findIndex((s, i) => i > 0 && s.status !== "failed");
  const previous = index > 0 ? finished[index] : null;
  const since = previous ? finished[index - 1].queued_at : (last?.queued_at ?? null);
  // Un último fallido no revisó nada: ni es el primer escaneo ni hay base que buscar.
  const ran = last !== null && last.status !== "failed";
  const more = total > scans.length;
  return { last, previous, since, firstScan: ran && previous === null && !more, unknown: ran && previous === null && more };
}

/** Hay con qué comparar: el último corrió (no falló) y hay un anterior que también corrió. */
export function comparable(base: ScanBase | null): base is ScanBase & { last: Scan; previous: Scan } {
  return base !== null && base.last !== null && base.previous !== null && base.last.status !== "failed";
}

const time = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
};

/**
 * El activo apareció en el último escaneo: first_seen_at entre `since` y el finished_at del último. Sin fallidos de por
 * medio, `since` es el queued_at del último y da lo mismo que new_assets de la API. Con fallidos de en medio, no.
 */
export function isNewAsset(asset: Pick<Asset, "first_seen_at">, base: Pick<ScanBase, "last" | "since">): boolean {
  const seen = time(asset.first_seen_at);
  const start = time(base.since);
  const end = time(base.last?.finished_at);
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
 * falló (no revisó nada). Un certificado con varios nombres en el SAN es el mismo 'emitido' en cada nombre: cuenta una
 * vez. Un activo de tipo 'certificate' nuevo cuenta aparte, por su valor.
 */
export function newAssetCounts(assets: Asset[], base: ScanBase): NewAssetCounts | null {
  if (!comparable(base)) return null;
  const counts: NewAssetCounts = { subdomains: 0, ips: 0, ports: 0, certificates: 0 };
  const certificates = new Set<string>();
  for (const asset of assets) {
    const fresh = isNewAsset(asset, base);
    if (fresh && asset.type === "subdomain") counts.subdomains += 1;
    if (fresh && asset.type === "ip") counts.ips += 1;
    if (fresh && asset.type === "service") counts.ports += 1;
    if (fresh && asset.type === "certificate") certificates.add(`certificate:${asset.value}`);
    if (hasNewCertificate(asset, base)) certificates.add(`emitido:${time(asset.attributes?.emitido)}`);
  }
  counts.certificates = certificates.size;
  return counts;
}

/**
 * Margen entre el finished_at de un escaneo y el last_scan_at de su dominio. El orquestador los guarda en la misma
 * transacción con dos clock_timestamp() seguidos (cirdan/orquestador/__init__.py, UPDATE scans y luego UPDATE domains),
 * así que nunca son iguales: last_scan_at queda unos microsegundos después, o más si espera el candado de la fila.
 */
export const SAME_CLOSE_MS = 60_000;

/** El last_scan_at del dominio es el cierre de este escaneo: cae entre su finished_at y SAME_CLOSE_MS después. */
export function sameClose(scanFinishedAt: string | null | undefined, domainLastScanAt: string | null | undefined): boolean {
  const end = time(scanFinishedAt);
  const at = time(domainLastScanAt);
  return end !== null && at !== null && at >= end && at - end <= SAME_CLOSE_MS;
}

export interface ScanList {
  items: Scan[];
  total: number;
}

export interface PanelAssets {
  firstScan: boolean;
  newAssets: NewAssetCounts | null;
}

/**
 * Conteos del panel del dashboard para un dominio. `general` es el /scans de la empresa (los 50 más nuevos), del que sale
 * la fecha del panel. Si ahí está su último escaneo pero no el anterior que corrió, se leen los 5 más nuevos del dominio
 * y se usan solo si su último es el mismo. Si no está (un dominio con score cuyo escaneo quedó fuera de esos 50, y la
 * fecha del panel es su last_scan_at), se leen igual y se usan solo si su último cerró con ese last_scan_at. El
 * inventario se lee solo si hay con qué comparar.
 */
export async function panelAssets(
  summary: { domain: string; finishedAt: string | null },
  general: ScanList,
  domainScans: (fqdn: string) => Promise<ScanList>,
  domainAssets: (fqdn: string) => Promise<Asset[]>,
): Promise<PanelAssets> {
  const none: PanelAssets = { firstScan: false, newAssets: null };
  let base = scanBase(general.items, summary.domain, general.total);
  if (!base.last || base.unknown) {
    if (!base.last && !summary.finishedAt) return none;
    const shown = base.last;
    const own = await domainScans(summary.domain);
    base = scanBase(own.items, summary.domain, own.total);
    if (shown ? base.last?.id !== shown.id : !sameClose(base.last?.finished_at, summary.finishedAt)) return none;
  }
  if (!comparable(base)) return { firstScan: base.firstScan, newAssets: null };
  return { firstScan: false, newAssets: newAssetCounts(await domainAssets(summary.domain), base) };
}

/**
 * Corre `task` sobre cada elemento con a lo más `limit` a la vez y devuelve los resultados en el mismo orden. Para que
 * el dashboard no lance todas las lecturas por dominio juntas.
 */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}

const plural = (n: number, one: string, many: string) => `${n} ${tx(n === 1 ? one : many)}`;

/** Texto del panel: '2 subdominios · 1 IP · 0 puertos · 1 certificado'. */
export function newAssetsText(counts: NewAssetCounts): string {
  return [
    plural(counts.subdomains, "subdominio", "subdominios"),
    plural(counts.ips, "IP", "IP"),
    plural(counts.ports, "puerto", "puertos"),
    plural(counts.certificates, "certificado", "certificados"),
  ].join(" · ");
}
