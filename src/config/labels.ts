import type { FindingSource, Severity } from "@/types";

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const SOURCE_LABELS: Record<FindingSource, string> = {
  ct: "CT",
  dns: "DNS",
  shodan: "Shodan",
  censys: "Censys",
  hibp: "HIBP",
};
