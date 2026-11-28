// Ciclo de remediación en Hallazgos (#80b, RC-172): qué puede hacer cada estado, la fecha de revisión del riesgo
// aceptado y los textos de las métricas. La API es POST /findings/{id}/triage y GET /domains/{fqdn}/remediation (RC-133).
import type {
  DomainRemediation,
  FindingStatus,
  FindingStatusFilter,
  FindingTriage,
  ResolvedReason,
  TriageRequest,
} from "@/types";
import { tx, localized } from "@/i18n/tx";

/** Pestañas del filtro de estado, en el orden en que se muestran. */
export const STATUS_FILTERS: { value: FindingStatusFilter; label: string }[] = localized([
  { value: "open", label: "Abiertos" },
  { value: "accepted_risk", label: "Riesgo aceptado" },
  { value: "false_positive", label: "Falsos positivos" },
  { value: "resolved", label: "Resueltos" },
  { value: "all", label: "Todos" },
]);

const FILTER_VALUES = new Set<string>(STATUS_FILTERS.map((f) => f.value));

/** El `?estado=` de la URL, o "open" si falta o no es uno conocido. */
export function statusFilterFromParam(param: string | string[] | undefined): FindingStatusFilter {
  return typeof param === "string" && FILTER_VALUES.has(param) ? (param as FindingStatusFilter) : "open";
}

export type TriageChoice = "false_positive" | "accepted_risk" | "resolved" | "open";

export const TRIAGE_CHOICE_LABELS: Record<TriageChoice, string> = localized({
  false_positive: "Falso positivo",
  accepted_risk: "Aceptar riesgo",
  resolved: "Marcar resuelto",
  open: "Reabrir",
});

export const TRIAGE_CHOICE_HELP: Record<TriageChoice, string> = localized({
  false_positive: "No es un riesgo real. Sale del score y se recalcula; queda como ejemplo para reentrenar el modelo.",
  accepted_risk: "Lo conoces y decides no corregirlo por ahora. Sigue en el score, pero sale del plan de acción hasta la fecha de revisión.",
  resolved: "Ya lo corregiste. Si el siguiente escaneo lo vuelve a ver, se reabre y cuenta como no remediado.",
  open: "Vuelve a la lista de abiertos y, si era falso positivo, al score.",
});

export const SECRET_RULE = "secret_in_public_repo";

/** Lo que se puede hacer con un hallazgo en su estado. Un riesgo aceptado también puede cambiar de fecha. */
export function triageChoices(status: FindingStatus): TriageChoice[] {
  switch (status) {
    case "open":
      return ["false_positive", "accepted_risk", "resolved"];
    case "accepted_risk":
      return ["accepted_risk", "resolved", "false_positive", "open"];
    case "false_positive":
    case "resolved":
      return ["open"];
  }
}

/** Motivos de "resuelto": "secreto rotado" solo en la regla de secretos (el orquestador no lo reabre por la misma huella). */
export function resolvedReasons(ruleCode: string): { value: ResolvedReason; label: string }[] {
  const base: { value: ResolvedReason; label: string }[] = [{ value: "fixed", label: tx("Corregido") }];
  return ruleCode === SECRET_RULE ? [...base, { value: "secret_rotated", label: tx("Secreto rotado (sigue en el historial de git)") }] : base;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Rango válido de la fecha de revisión: de mañana a un año, como la API. */
export function reviewDateRange(today: Date = new Date()): { min: string; max: string; suggested: string } {
  const day = 24 * 60 * 60 * 1000;
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return {
    min: isoDate(new Date(base + day)),
    max: isoDate(new Date(base + 365 * day)),
    suggested: isoDate(new Date(base + 90 * day)),
  };
}

/** Error de la fecha de revisión, o null si sirve. */
export function reviewDateError(value: string, today: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    return tx("Elige la fecha en que se revisará el riesgo.");
  }
  const { min, max } = reviewDateRange(today);
  if (value < min || value > max) return tx("La fecha de revisión debe estar entre mañana y un año a partir de hoy.");
  return null;
}

export const NOTE_MAX = 500;

/** El cuerpo de POST /findings/{id}/triage. La nota vacía no se manda. */
export function triageRequest(
  choice: TriageChoice,
  { reviewDate, reason, note }: { reviewDate?: string; reason?: ResolvedReason; note?: string } = {},
): TriageRequest {
  const body: TriageRequest = { status: choice };
  if (choice === "accepted_risk" && reviewDate) body.review_date = reviewDate;
  if (choice === "resolved" && reason) body.reason = reason;
  const trimmed = note?.trim();
  if (trimmed) body.note = trimmed.slice(0, NOTE_MAX);
  return body;
}

const ACTION_TEXT: Record<FindingTriage["action"], string> = localized({
  "finding.false_positive": "Marcado como falso positivo",
  "finding.accepted_risk": "Riesgo aceptado",
  "finding.resolved": "Marcado como resuelto",
  "finding.reopened": "Reabierto",
});

/** "Riesgo aceptado por ana@x.mx el 26 nov 2026 · revisión 15 ene 2027". */
export function triageSummary(triage: FindingTriage, formatDate: (iso: string) => string): string {
  const parts = [ACTION_TEXT[triage.action]];
  if (triage.by) parts.push(tx("por {0}", triage.by));
  parts.push(tx("el {0}", formatDate(triage.at)));
  let text = parts.join(" ");
  if (triage.reason === "secret_rotated") text += tx(" · secreto rotado");
  if (triage.review_date) text += tx(" · revisión {0}", formatDate(triage.review_date));
  return text;
}

/** Textos de las tarjetas de remediación. Sin datos, un guion y por qué. */
export function remediationTexts(m: DomainRemediation): { mttr: string; mttrHint: string; closed: string; closedHint: string } {
  const days = m.mean_time_to_remediate_days;
  return {
    mttr: days === null ? "—" : `${days.toLocaleString("es-MX", { maximumFractionDigits: 1 })} ${days === 1 ? tx("día") : tx("días")}`,
    mttrHint: days === null ? tx("Todavía no hay hallazgos resueltos") : tx("Promedio de {0} {1}", m.remediated_count, m.remediated_count === 1 ? tx("hallazgo resuelto") : tx("hallazgos resueltos")),
    closed: m.closed_pct === null ? "—" : `${m.closed_pct.toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`,
    closedHint: m.closed_pct === null
      ? tx("Sin hallazgos que contar")
      : tx("{0} de {1} (sin falsos positivos)", m.closed, m.total - m.by_status.false_positive),
  };
}
