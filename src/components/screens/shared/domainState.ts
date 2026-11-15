// Estado de un dominio para mostrarlo en tablas: autorizado, por validar, vencido, etc.
import type { Domain, Scan } from "@/types";
import type { Tone } from "@/components/ui/tones";

export interface DomainState {
  label: string;
  tone: Tone;
}

export function domainState(domain: Domain): DomainState {
  if (domain.status === "removed") return { label: "Eliminado", tone: "gray" };
  if (domain.authorization.status === "revoked") return { label: "Revocada", tone: "red" };
  if (domain.authorization.status === "expired") return { label: "Vencido", tone: "red" };
  if (domain.status === "paused") return { label: "En pausa", tone: "gray" };
  if (domain.authorization.status === "missing") return { label: "Sin autorización", tone: "amber" };
  if (domain.txt.status !== "verified" || domain.status === "pending_verification") return { label: "Pendiente TXT", tone: "amber" };
  return { label: "Autorizado", tone: "teal" };
}

/** Lo que dice la columna Nivel de la tabla Dominios para un dominio sin score: su estado, o «Sin calcular» si está autorizado. */
export function unscoredLabel(domain: Domain): string {
  const state = domainState(domain);
  return state.label === "Autorizado" ? "Sin calcular" : state.label;
}

/** Dominios con score, de mayor a menor riesgo. */
export function scoredDomains(domains: Domain[]): Domain[] {
  return domains.filter((d) => d.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Tiene score o hallazgos abiertos: un primer escaneo en curso o caído ya puede guardar hallazgos sin score. */
export function hasResults(domain: Domain): boolean {
  return domain.score !== null || Object.values(domain.open_findings).some((count) => count > 0);
}

/** Dominios con score (de mayor a menor riesgo) y luego los que solo tienen hallazgos abiertos. */
export function resultDomains(domains: Domain[]): Domain[] {
  return [...scoredDomains(domains), ...domains.filter((d) => d.score === null && hasResults(d))];
}

/**
 * Fecha del último escaneo terminado si falló y no es anterior al último que calculó el riesgo; si no, null.
 * Un cierre normal con todas las fuentes caídas guarda el fallo y el riesgo con la misma fecha.
 */
export function failedScanAt(domain: Domain, scan: Scan | undefined): string | null {
  if (scan?.status !== "failed" || !scan.finished_at) return null;
  return !domain.last_scan_at || Date.parse(scan.finished_at) >= Date.parse(domain.last_scan_at) ? scan.finished_at : null;
}

/**
 * Hora del último escaneo terminado sin fallo: cuándo terminó, si /scans lo trae. Si el último terminado falló, vale
 * last_scan_at, para no mostrar la hora del fallido sin decir que falló. Un fallido más nuevo lo marca failedScanAt.
 */
export function lastScanAt(domain: Domain, scan: Scan | undefined): string | null {
  if (scan?.status === "failed") return domain.last_scan_at;
  return scan?.finished_at ?? domain.last_scan_at;
}
