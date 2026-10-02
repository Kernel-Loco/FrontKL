import type { DashboardSummary, Finding } from "@/types";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const recentFindings: Finding[] = [
  { id: "f-1042", title: "Apache HTTP Server con CVE-2024-38476", asset: "portal.acme-corp.mx", severity: "critical", source: "shodan", cvss: 9.8, epss: 0.94, in_kev: true, detected_at: hoursAgo(2) },
  { id: "f-1041", title: "Credenciales corporativas en filtración pública", asset: "acme-corp.mx", severity: "critical", source: "hibp", cvss: null, epss: null, in_kev: false, detected_at: hoursAgo(5) },
  { id: "f-1040", title: "RDP expuesto a Internet (3389/tcp)", asset: "203.0.113.24", severity: "high", source: "censys", cvss: 8.1, epss: 0.62, in_kev: true, detected_at: hoursAgo(9) },
  { id: "f-1039", title: "Subdominio nuevo sin inventariar", asset: "staging-api.acme-corp.mx", severity: "medium", source: "ct", cvss: null, epss: null, in_kev: false, detected_at: hoursAgo(14) },
  { id: "f-1038", title: "Registro SPF permisivo (+all)", asset: "acme-corp.mx", severity: "medium", source: "dns", cvss: 5.3, epss: null, in_kev: false, detected_at: hoursAgo(20) },
  { id: "f-1037", title: "OpenSSH 8.9 con CVE-2023-38408", asset: "vpn.acme-corp.mx", severity: "high", source: "shodan", cvss: 7.3, epss: 0.21, in_kev: false, detected_at: hoursAgo(26) },
  { id: "f-1036", title: "Certificado TLS por expirar en 7 días", asset: "mail.acme-corp.mx", severity: "low", source: "ct", cvss: null, epss: null, in_kev: false, detected_at: hoursAgo(31) },
  { id: "f-1035", title: "WHOIS con datos de contacto expuestos", asset: "acme-corp.mx", severity: "low", source: "dns", cvss: null, epss: null, in_kev: false, detected_at: hoursAgo(40) },
];

export function buildMockSummary(): DashboardSummary {
  return {
    monitored_assets: 128,
    critical_findings: recentFindings.filter((f) => f.severity === "critical").length,
    kev_findings: recentFindings.filter((f) => f.in_kev).length,
    average_risk_score: 72,
    last_scan_at: hoursAgo(1.5),
    recent_findings: recentFindings,
  };
}
