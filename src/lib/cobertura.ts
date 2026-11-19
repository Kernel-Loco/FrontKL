// Códigos sin cobertura del último escaneo con su motivo (RC-229). La API los da en `coverage_gaps` de
// GET /domains/{fqdn}/score (cirdan/score/cobertura.py de BackKL). Con cobertura parcial el portal nunca dice 0 hallazgos.
import type { CoverageGap, CoverageGapReason } from "@/types";

/** Lo que dice el portal en vez de 0 hallazgos cuando la cobertura es parcial. */
export const NO_FINDINGS_PARTIAL = "Sin hallazgos en las fuentes que respondieron";

/** Motivo de cada grupo, en el orden en que se muestran. */
export const COVERAGE_GAP_REASON_LABELS: Record<CoverageGapReason, string> = {
  source_failed: "No respondió la fuente",
  source_not_run: "No corrió en este escaneo (fuente apagada)",
  no_api_key: "Sin llave de la API de host de Shodan",
  source_partial: "La fuente respondió pero no pudo revisarlas",
};

const ORDER = Object.keys(COVERAGE_GAP_REASON_LABELS) as CoverageGapReason[];

/** Nombre de cada fuente de los escaneos. Incluye web, api_docs y subfinder, que no son fuentes de hallazgos. */
export const COVERAGE_SOURCE_LABELS: Record<string, string> = {
  ct_logs: "crt.sh",
  dns: "DNS",
  whois: "WHOIS",
  shodan: "Shodan",
  github: "GitHub",
  web: "Visita web",
  api_docs: "Documentación de APIs",
  subfinder: "subfinder",
};

export interface CoverageGroup {
  reason: CoverageGapReason;
  label: string;
  /** Una fila por fuente, con sus códigos. `name` es «Fuente sin identificar» si la API no supo cuál. */
  sources: { source: string | null; name: string; codes: string[] }[];
}

/** Agrupa los códigos por motivo y por fuente, en el orden de COVERAGE_GAP_REASON_LABELS. */
export function coverageGroups(gaps: CoverageGap[]): CoverageGroup[] {
  return ORDER.flatMap((reason) => {
    const bySource = new Map<string | null, string[]>();
    for (const gap of gaps.filter((g) => g.reason === reason)) {
      bySource.set(gap.source, [...(bySource.get(gap.source) ?? []), gap.code]);
    }
    if (bySource.size === 0) return [];
    return [{
      reason,
      label: COVERAGE_GAP_REASON_LABELS[reason],
      sources: [...bySource].map(([source, codes]) => ({
        source,
        name: source === null ? "Fuente sin identificar" : COVERAGE_SOURCE_LABELS[source] ?? source,
        codes,
      })),
    }];
  });
}

/** Una línea por grupo: «No respondió la fuente: crt.sh (cert_expired, lookalike_domain)». */
export function coverageLines(gaps: CoverageGap[]): string[] {
  return coverageGroups(gaps).map(
    (group) => `${group.label}: ${group.sources.map((s) => `${s.name} (${s.codes.join(", ")})`).join("; ")}`,
  );
}

/** Texto de la lista vacía: con cobertura parcial nunca «Sin hallazgos abiertos» ni 0 hallazgos. */
export function noFindingsTitle(partial: boolean): string {
  return partial ? NO_FINDINGS_PARTIAL : "Sin hallazgos abiertos";
}
