// Datos simulados de los endpoints que todavía no están en el contrato #21. Salen de los
// datos demo de BackKL (db/semillas/001_datos_demo.sql) para que cuadren con la base.
import type {
  AlertPolicies,
  AuditEntry,
  ListResponse,
  OrgSettings,
  OrgUser,
  Report,
  TxtVerification,
} from "@/types";

/** Reportes de Acme Demo (tabla reports). */
export const mockReports: ListResponse<Report> = {
  items: [
    { id: "b2000000-0000-4000-8000-000000000002", kind: "pdf_report", domain: null, period_start: "2026-09-01", period_end: "2026-09-30", status: "ready", generated_at: "2026-09-30T14:45:00-06:00", download_url: "#" },
    { id: "b2000000-0000-4000-8000-000000000001", kind: "weekly_summary", domain: "acme-demo.mx", period_start: "2026-09-23", period_end: "2026-09-30", status: "ready", generated_at: "2026-09-30T14:40:00-06:00", download_url: "#" },
  ],
  total: 2,
};

/** Usuarios de Acme Demo (los de la semilla de la base; las tres primeras son las cuentas de demo). */
export const mockUsers: ListResponse<OrgUser> = {
  items: [
    { id: "30000000-0000-4000-8000-000000000001", full_name: "Alex Morgan", email: "alex.morgan@acme-demo.mx", role: "admin", mfa_enabled: true, is_active: true, last_login_at: "2026-10-14T08:05:00-06:00" },
    { id: "30000000-0000-4000-8000-000000000002", full_name: "Maya Reed", email: "maya.reed@acme-demo.mx", role: "gerente", mfa_enabled: true, is_active: true, last_login_at: "2026-10-10T17:40:00-06:00" },
    { id: "30000000-0000-4000-8000-000000000003", full_name: "Jordan Tate", email: "jordan.tate@acme-demo.mx", role: "analista", mfa_enabled: true, is_active: true, last_login_at: "2026-10-13T09:12:00-06:00" },
    { id: "u-004", full_name: "Diego Salas", email: "diego.salas@acme-demo.mx", role: "analista", mfa_enabled: false, is_active: false, last_login_at: null },
  ],
  total: 4,
};

/** Configuración de Acme Demo (organizations, integrations y api_keys). */
export const mockSettings: OrgSettings = {
  organization_name: "Acme Demo",
  plan: "business",
  alert_score_threshold: 60,
  integrations: [
    { id: "b0000000-0000-4000-8000-000000000001", kind: "email", name: "Alertas para gerencia y resumen semanal", endpoint: "maya.reed@acme-demo.mx", enabled: true, events: ["score.above_threshold", "report.weekly_summary"] },
    { id: "b0000000-0000-4000-8000-000000000002", kind: "webhook", name: "Canal de seguridad", endpoint: "https://hooks.acme-demo.mx/lowtide", enabled: true, events: ["finding.created", "score.above_threshold"] },
    { id: "b0000000-0000-4000-8000-000000000003", kind: "siem_cef", name: "SIEM corporativo (CEF)", endpoint: "https://siem.acme-demo.mx/cef", enabled: false, events: ["finding.created", "finding.resolved"] },
  ],
  api_keys: [
    { id: "c0000000-0000-4000-8000-000000000001", name: "SIEM corporativo", key_prefix: "CIRDAN_FAKE_7f3a", scopes: ["findings:read", "scores:read"], created_at: "2026-09-10T11:00:00-06:00", expires_at: "2026-12-09T11:00:00-06:00", last_used_at: "2026-10-13T23:00:00-06:00", revoked_at: null },
  ],
};

/** Registro TXT que cada dominio debe publicar (solo Admin). */
export const mockTxtVerifications: ListResponse<TxtVerification> = {
  items: [
    { fqdn: "acme-demo.mx", status: "verified", expected_value: "cirdan-verification=CIRDAN_FAKE_c41d7e2a9b06", checked_at: "2026-09-30T14:19:20-06:00" },
    { fqdn: "acme-tienda.mx", status: "verified", expected_value: "cirdan-verification=CIRDAN_FAKE_5e9a1f3c7d28", checked_at: "2026-09-29T09:11:30-06:00" },
    { fqdn: "acme-portal.mx", status: "verified", expected_value: "cirdan-verification=CIRDAN_FAKE_a2b8c6e4f019", checked_at: "2026-09-27T18:44:10-06:00" },
    { fqdn: "partner-example.com", status: "missing", expected_value: "cirdan-verification=CIRDAN_FAKE_8f3c2a91e7b4", checked_at: "2026-10-01T16:10:00-06:00" },
    { fqdn: "old-example.net", status: "verified", expected_value: "cirdan-verification=CIRDAN_FAKE_3d7f9b1e5c82", checked_at: "2026-10-01T06:00:00-06:00" },
  ],
  total: 5,
};

/** Políticas de alerta de Acme Demo. */
export const mockAlertPolicies: AlertPolicies = {
  alert_score_threshold: 60,
  policies: [
    { event: "score.above_threshold", enabled: true, min_severity: null },
    { event: "finding.created", enabled: true, min_severity: "high" },
    { event: "finding.resolved", enabled: false, min_severity: null },
    { event: "authorization.expiring", enabled: true, min_severity: null },
    { event: "scan.partial", enabled: true, min_severity: null },
  ],
};

/** Bitácora de Acme Demo (tabla audit_log), del más nuevo al más viejo. */
export const mockAuditLog: ListResponse<AuditEntry> = {
  items: [
    { id: "c0000000-0000-4000-8000-000000000006", occurred_at: "2026-09-30T14:47:00-06:00", actor_type: "user", actor: "maya.reed@acme-demo.mx", action: "report.downloaded", entity_type: "report", details: { kind: "pdf_report" } },
    { id: "c0000000-0000-4000-8000-000000000005", occurred_at: "2026-09-30T14:25:00-06:00", actor_type: "system", actor: null, action: "alert.created", entity_type: "alert", details: { event_type: "score.above_threshold", score: 68 } },
    { id: "c0000000-0000-4000-8000-000000000004", occurred_at: "2026-09-30T14:24:30-06:00", actor_type: "system", actor: null, action: "finding.severity_changed", entity_type: "finding", details: { from: "high", to: "critical" } },
    { id: "c0000000-0000-4000-8000-000000000003", occurred_at: "2026-09-15T11:02:00-06:00", actor_type: "user", actor: "maya.reed@acme-demo.mx", action: "organization.threshold_changed", entity_type: "organization", details: { alert_score_threshold: 60 } },
    { id: "c0000000-0000-4000-8000-000000000002", occurred_at: "2026-09-01T09:55:00-06:00", actor_type: "user", actor: "alex.morgan@acme-demo.mx", action: "authorization.uploaded", entity_type: "domain_authorization", details: { fqdn: "acme-demo.mx", valid_until: "2026-12-31" } },
    { id: "c0000000-0000-4000-8000-000000000001", occurred_at: "2026-09-01T09:40:00-06:00", actor_type: "user", actor: "alex.morgan@acme-demo.mx", action: "domain.added", entity_type: "domain", details: { fqdn: "acme-demo.mx" } },
  ],
  total: 6,
};
