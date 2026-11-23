// Códigos sin cobertura del último escaneo con su motivo (RC-229). La API los da en `coverage_gaps` de
// GET /domains/{fqdn}/score (cirdan/score/cobertura.py de BackKL). Con cobertura parcial el portal nunca dice 0 hallazgos.
import type { CoverageGap, CoverageGapReason } from "@/types";

/** Lo que dice el portal en vez de 0 hallazgos cuando la cobertura es parcial. */
export const NO_FINDINGS_PARTIAL = "Sin hallazgos en las fuentes que respondieron";

/** Motivo de cada grupo, en el orden en que se muestran. */
export const COVERAGE_GAP_REASON_LABELS: Record<CoverageGapReason, string> = {
  source_failed: "No respondió la fuente",
  source_not_run: "No corrió en este escaneo (fuente apagada)",
  no_api_key: "Sin llave de la fuente",
  source_partial: "La fuente respondió pero no pudo revisarlas",
  partially_checked: "Revisadas solo en una parte de lo de la fuente",
};

/**
 * Con no_api_key cada fuente va en su propio grupo con su texto (RC-54): sin la API de host Shodan no revisa algunos
 * códigos y sin la llave de la plataforma HIBP no revisa ninguno, y el portal dice «Sin cobertura de HIBP», nunca 0.
 * Una fuente que no está aquí usa el texto general de COVERAGE_GAP_REASON_LABELS.
 */
export const NO_API_KEY_LABELS: Record<string, string> = {
  shodan: "Sin llave de la API de host de Shodan",
  hibp: "Sin cobertura de HIBP",
};

/**
 * Fuentes con su propio texto con los demás motivos (RC-54): si HIBP no respondió, no tuvo correos que consultar o
 * no hay grabación, el portal también dice «Sin cobertura de HIBP», con el motivo después, y nunca 0. partially_checked
 * no entra: la búsqueda por correo siempre es parcial y trae hallazgos (ownLabel).
 */
export const SOURCE_GAP_LABELS: Record<string, string> = {
  hibp: "Sin cobertura de HIBP",
};

/** El texto propio del grupo de una fuente con un motivo, o null si va en el grupo general del motivo. */
function ownLabel(reason: CoverageGapReason, source: string | null): string | null {
  if (source === null) return null;
  if (reason === "no_api_key" && Object.hasOwn(NO_API_KEY_LABELS, source)) return NO_API_KEY_LABELS[source];
  // partially_checked no: la búsqueda por correo de HIBP siempre es parcial y sí trae hallazgos
  if (reason === "partially_checked" || !Object.hasOwn(SOURCE_GAP_LABELS, source)) return null;
  const why = COVERAGE_GAP_REASON_LABELS[reason];
  return `${SOURCE_GAP_LABELS[source]}: ${why.charAt(0).toLowerCase()}${why.slice(1)}`;
}

/** Grupo de un motivo que el portal todavía no conoce: se muestra aparte, nunca se descarta. */
export const OTHER_REASON_LABEL = "Otro motivo";

const ORDER = Object.keys(COVERAGE_GAP_REASON_LABELS) as CoverageGapReason[];

/**
 * El último escaneo no revisó todo: cobertura parcial o algún código sin revisar, aunque partial_coverage venga en
 * false (una fuente apagada da source_not_run sin dejar el escaneo parcial). Con esto el portal nunca dice 0 hallazgos.
 */
export function coverageIncomplete(score: { partial_coverage: boolean; coverage_gaps?: CoverageGap[] } | null | undefined): boolean {
  return !!score && (score.partial_coverage || (score.coverage_gaps?.length ?? 0) > 0);
}

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
  hibp: "Have I Been Pwned",
};

export interface CoverageGroup {
  /**
   * Un motivo de COVERAGE_GAP_REASON_LABELS (no_api_key puede repetirse, uno por fuente con texto propio) o, si la API
   * trae uno nuevo, ese texto tal cual en el grupo «Otro motivo».
   */
  reason: string;
  label: string;
  /** Una fila por fuente, con sus códigos. `name` es «Fuente sin identificar» si la API no supo cuál. */
  sources: { source: string | null; name: string; codes: string[] }[];
}

function bySourceOf(gaps: CoverageGap[]): CoverageGroup["sources"] {
  const bySource = new Map<string | null, string[]>();
  for (const gap of gaps) bySource.set(gap.source, [...(bySource.get(gap.source) ?? []), gap.code]);
  return [...bySource].map(([source, codes]) => ({
    source,
    name: source === null ? "Fuente sin identificar"
      : Object.hasOwn(COVERAGE_SOURCE_LABELS, source) ? COVERAGE_SOURCE_LABELS[source] : source,
    codes,
  }));
}

/**
 * Agrupa los códigos por motivo y por fuente, en el orden de COVERAGE_GAP_REASON_LABELS. Los de un motivo que el
 * portal no conoce van al final, en «Otro motivo», con el motivo junto a cada fuente.
 */
export function coverageGroups(gaps: CoverageGap[]): CoverageGroup[] {
  const known = ORDER.flatMap((reason): CoverageGroup[] => {
    const sources = bySourceOf(gaps.filter((g) => g.reason === reason));
    if (sources.length === 0) return [];
    // Las fuentes con texto propio van primero, cada una en su grupo, y las demás juntas en el texto general.
    const own = sources.filter((s) => ownLabel(reason, s.source) !== null);
    const rest = sources.filter((s) => !own.includes(s));
    return [
      ...own.map((s) => ({ reason, label: ownLabel(reason, s.source) as string, sources: [s] })),
      ...(rest.length === 0 ? [] : [{ reason, label: COVERAGE_GAP_REASON_LABELS[reason], sources: rest }]),
    ];
  });
  const unknown = gaps.filter((g) => !(ORDER as string[]).includes(g.reason));
  if (unknown.length === 0) return known;
  const reasons = [...new Set(unknown.map((g) => String(g.reason)))];
  const sources = reasons.flatMap((reason) =>
    bySourceOf(unknown.filter((g) => g.reason === reason)).map((s) => ({ ...s, name: `${s.name}, ${reason}` })));
  return [...known, { reason: "other", label: OTHER_REASON_LABEL, sources }];
}

/** Texto de CoverageGapsList cuando no queda ningún grupo que listar. */
export const COVERAGE_GAPS_MISSING = "Esta versión de la API no dice qué reglas quedaron sin revisar.";
export const COVERAGE_GAPS_EMPTY =
  "La API no detalló qué reglas quedaron sin revisar. Puede que alguna fuente haya revisado solo una parte de sus repos o IP.";

/**
 * Lo que dice CoverageGapsList en vez de la lista: sin `coverage_gaps` (una API de antes) o con la lista vacía (un
 * escaneo sin corridas o una API anterior a partially_checked). Nunca afirma que todas las reglas se revisaron. Con
 * algún código, null: va la lista.
 */
export function coverageGapsFallback(gaps: CoverageGap[] | undefined): string | null {
  if (gaps === undefined) return COVERAGE_GAPS_MISSING;
  return coverageGroups(gaps).length === 0 ? COVERAGE_GAPS_EMPTY : null;
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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * El contador de la lista de hallazgos. Con cobertura parcial (o sin score) y la lista vacía no dice «0 de 0»: dice
 * que no hay en lo que se revisó.
 */
export function findingsCountLabel(shown: number, total: number, incomplete: boolean): string {
  if (total === 0 && incomplete) return "Ningún hallazgo registrado en las fuentes que respondieron";
  return `${shown} de ${plural(total, "hallazgo", "hallazgos")}`;
}

/** Lo que dice el KPI de críticos en vez de 0 cuando algún dominio quedó parcial o sin escaneo completo. */
export const NO_CRITICAL_INCOMPLETE = "Ninguno en lo revisado";

/**
 * KPI de hallazgos críticos del tablero. Con críticos, su número. Sin críticos, 0 solo si todos los dominios con score
 * tienen cobertura completa y no hay dominios autorizados sin escaneo completo. Si no, un texto, y el 0 va en la pista.
 */
export function criticalKpi(critical: number, scored: number, partial: number, unscanned: number): { value: number | string; hint: string } {
  const parts = [
    unscanned > 0 ? `${plural(unscanned, "dominio", "dominios")} sin escaneo completo` : "",
    partial > 0 ? "cobertura parcial: puede no estar al día" : "",
  ];
  const incomplete = partial > 0 || unscanned > 0;
  // Sin ningún dominio con score no hay 0 que dar, aunque ninguno esté autorizado (Pendiente TXT, Sin autorización o
  // Vencido no cuentan como sin escaneo completo).
  if (critical === 0 && scored === 0) {
    return { value: "Sin escaneo completo", hint: ["0 críticos abiertos registrados", ...parts].filter(Boolean).join(" · ") };
  }
  if (critical > 0 || !incomplete) return { value: critical, hint: parts.filter(Boolean).join(" · ") };
  return {
    value: NO_CRITICAL_INCOMPLETE,
    hint: ["0 críticos abiertos registrados", ...parts].filter(Boolean).join(" · "),
  };
}

/**
 * Textos de CVSS, EPSS y KEV del panel de un hallazgo con CVE (RC-229). Un dato que falta dice «Sin dato». in_kev
 * llega en null cuando nadie ha revisado esa CVE contra KEV, y entonces no se puede decir que no está en el catálogo.
 */
export function cveFacts(finding: { cvss: number | null; epss: number | null; in_kev: boolean | null }): { cvss: string; epss: string; kev: string } {
  return {
    cvss: finding.cvss != null ? finding.cvss.toFixed(1) : "Sin dato",
    epss: finding.epss != null ? epssText(finding.epss) : "Sin dato",
    kev: finding.in_kev === null ? "Sin dato" : finding.in_kev ? "Explotada activamente" : "No está en el catálogo",
  };
}

/** EPSS como porcentaje: con dos decimales y «< 0.01 %» para lo que redondeado daría 0 sin serlo. */
export function epssText(epss: number): string {
  const percent = epss * 100;
  if (percent > 0 && percent < 0.01) return "< 0.01 %";
  return `${percent.toFixed(2)} %`;
}
