// Tipos de hallazgos y métricas del dashboard (esquemas de FastAPI).

export type Severity = "critical" | "high" | "medium" | "low";

/** Fuente OSINT que originó el hallazgo. */
export type FindingSource = "ct" | "dns" | "shodan" | "censys" | "hibp";

export interface Finding {
  id: string;
  title: string;
  asset: string;
  severity: Severity;
  source: FindingSource;
  /** CVSS base score (0–10), si aplica a una CVE. */
  cvss: number | null;
  /** Probabilidad EPSS (0–1), si aplica a una CVE. */
  epss: number | null;
  /** La CVE está en el catálogo CISA KEV. */
  in_kev: boolean;
  detected_at: string;
}

export interface DashboardSummary {
  monitored_assets: number;
  critical_findings: number;
  kev_findings: number;
  /** Score de riesgo promedio (0–100). */
  average_risk_score: number;
  last_scan_at: string;
  recent_findings: Finding[];
}
