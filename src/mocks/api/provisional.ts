// Datos simulados de los endpoints que todavía no están en el contrato #21. Salen de los
// datos demo de BackKL (db/semillas/001_datos_demo.sql) para que cuadren con la base.
import type {
  AlertPolicies,
  Asset,
  AuditEntry,
  FindingExplanation,
  ListResponse,
  OrgSettings,
  OrgUser,
  Report,
  Scan,
  TxtVerification,
} from "@/types";

/** Activos de acme-demo.mx (tabla assets). */
export const mockAssets: ListResponse<Asset> = {
  items: [
    { id: "70000000-0000-4000-8000-000000000001", type: "domain", value: "acme-demo.mx", parent: null, attributes: { dns: { mx: true, dmarc: null } }, first_seen_at: "2026-09-01T10:00:00-06:00", last_seen_at: "2026-09-30T14:24:00-06:00" },
    { id: "70000000-0000-4000-8000-000000000002", type: "subdomain", value: "dev.acme-demo.mx", parent: "acme-demo.mx", attributes: { source: "ct_logs" }, first_seen_at: "2026-09-02T10:30:00-06:00", last_seen_at: "2026-09-30T14:24:00-06:00" },
    { id: "70000000-0000-4000-8000-000000000003", type: "subdomain", value: "www.acme-demo.mx", parent: "acme-demo.mx", attributes: { source: "ct_logs" }, first_seen_at: "2026-09-02T10:30:00-06:00", last_seen_at: "2026-09-30T14:24:00-06:00" },
    { id: "70000000-0000-4000-8000-000000000004", type: "certificate", value: "9f2c4e7a1b0d3c5e8f6a2b4d7e9c1a3f5b8d0e2c4a6f8b1d3e5c7a9f0b2d4e6c", parent: "dev.acme-demo.mx", attributes: { subject: "dev.acme-demo.mx", not_after: "2026-09-12" }, first_seen_at: "2026-09-02T10:30:00-06:00", last_seen_at: "2026-09-30T14:24:00-06:00" },
    { id: "70000000-0000-4000-8000-000000000005", type: "ip", value: "198.51.100.10", parent: "www.acme-demo.mx", attributes: {}, first_seen_at: "2026-09-02T10:30:00-06:00", last_seen_at: "2026-09-30T14:24:00-06:00" },
    { id: "70000000-0000-4000-8000-000000000006", type: "service", value: "198.51.100.10:443/tcp", parent: "198.51.100.10", attributes: { cms_version_status: "outdated" }, first_seen_at: "2026-09-02T10:30:00-06:00", last_seen_at: "2026-09-30T14:24:00-06:00" },
  ],
  total: 6,
};

/** Escaneos de Acme Demo (tablas scans y scan_source_runs), del más nuevo al más viejo. */
export const mockScans: ListResponse<Scan> = {
  items: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      domain: "acme-demo.mx",
      trigger: "scheduled",
      status: "completed",
      queued_at: "2026-09-30T14:20:00-06:00",
      finished_at: "2026-09-30T14:24:10-06:00",
      stats: { assets: 6, new_findings: 3, resolved_findings: 0 },
      sources: [
        { source: "ct_logs", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-30T14:21:05-06:00" },
        { source: "dns", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-30T14:20:40-06:00" },
        { source: "whois", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-30T14:20:50-06:00" },
        { source: "shodan", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-30T14:22:30-06:00" },
        { source: "hibp", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-30T14:22:10-06:00" },
      ],
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      domain: "acme-tienda.mx",
      trigger: "scheduled",
      status: "completed",
      queued_at: "2026-09-29T09:12:00-06:00",
      finished_at: "2026-09-29T09:15:40-06:00",
      stats: { assets: 4, new_findings: 1, resolved_findings: 0 },
      sources: [],
    },
    {
      id: "60000000-0000-4000-8000-000000000003",
      domain: "acme-portal.mx",
      trigger: "scheduled",
      status: "completed",
      queued_at: "2026-09-27T18:45:00-06:00",
      finished_at: "2026-09-27T18:48:20-06:00",
      stats: { assets: 3, new_findings: 2, resolved_findings: 0 },
      sources: [],
    },
    {
      id: "60000000-0000-4000-8000-0000000000b1",
      domain: "acme-demo.mx",
      trigger: "on_demand",
      status: "partial",
      queued_at: "2026-09-16T14:20:00-06:00",
      finished_at: "2026-09-16T14:58:30-06:00",
      stats: { assets: 5, new_findings: 1, resolved_findings: 0 },
      sources: [
        { source: "ct_logs", status: "failed", attempt: 3, error: "crt.sh no respondió después de 3 intentos", finished_at: "2026-09-16T14:58:30-06:00" },
        { source: "dns", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-16T14:20:35-06:00" },
        { source: "whois", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-16T14:20:48-06:00" },
        { source: "shodan", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-16T14:22:10-06:00" },
        { source: "hibp", status: "succeeded", attempt: 1, error: null, finished_at: "2026-09-16T14:21:55-06:00" },
      ],
    },
  ],
  total: 4,
};

/** Reportes de Acme Demo (tabla reports). */
export const mockReports: ListResponse<Report> = {
  items: [
    { id: "b2000000-0000-4000-8000-000000000002", kind: "pdf_report", domain: null, period_start: "2026-09-01", period_end: "2026-09-30", status: "ready", generated_at: "2026-09-30T14:45:00-06:00", download_url: "#" },
    { id: "b2000000-0000-4000-8000-000000000001", kind: "weekly_summary", domain: "acme-demo.mx", period_start: "2026-09-23", period_end: "2026-09-30", status: "ready", generated_at: "2026-09-30T14:40:00-06:00", download_url: "#" },
  ],
  total: 2,
};

/** Usuarios de Acme Demo. Los 3 primeros son las cuentas de prueba del login (src/mocks/users.ts). */
export const mockUsers: ListResponse<OrgUser> = {
  items: [
    { id: "u-001", full_name: "Ana Torres", email: "analista@cirdan.test", role: "analista", mfa_enabled: true, is_active: true, last_login_at: "2026-10-13T09:12:00-06:00" },
    { id: "u-002", full_name: "Gabriel Méndez", email: "gerente@cirdan.test", role: "gerente", mfa_enabled: true, is_active: true, last_login_at: "2026-10-10T17:40:00-06:00" },
    { id: "u-003", full_name: "Alex Ramírez", email: "admin@cirdan.test", role: "admin", mfa_enabled: true, is_active: true, last_login_at: "2026-10-14T08:05:00-06:00" },
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
    { id: "c0000000-0000-4000-8000-000000000001", name: "SIEM corporativo", key_prefix: "lt_live_7f3a", scopes: ["findings:read", "scores:read"], created_at: "2026-09-10T11:00:00-06:00", expires_at: "2026-12-09T11:00:00-06:00", last_used_at: "2026-10-13T23:00:00-06:00", revoked_at: null },
  ],
};

/**
 * Explicación de los demás hallazgos de acme-demo.mx. La del hallazgo de la brecha está en
 * contrato.ts (explicacion.json); estas siguen su misma forma.
 */
export const mockExplanationsExtra: Record<string, Omit<FindingExplanation, "title" | "severity" | "base_severity" | "category" | "rule_code" | "caracteristicas">> = {
  "80000000-0000-4000-8000-000000000002": {
    finding_id: "80000000-0000-4000-8000-000000000002",
    domain: "acme-demo.mx",
    score_id: "a0000000-0000-4000-8000-000000000001",
    computed_at: "2026-09-30T14:24:30-06:00",
    method: "rules",
    penalty: 14,
    max_penalty: 20,
    factors: [
      { label: "El subdominio todavía resuelve en DNS", points: 8 },
      { label: "Venció hace menos de 30 días", points: 4 },
      { label: "Parece un entorno de desarrollo olvidado", points: 2 },
    ],
    summary: "Es alto porque el sitio sigue en línea con un certificado vencido: cualquiera puede suplantarlo y los navegadores ya muestran alertas.",
    recommendation: "Renueva el certificado de dev.acme-demo.mx o, si ya no se usa, elimina su registro DNS.",
    confidence: null,
    shap: null,
  },
  "80000000-0000-4000-8000-000000000003": {
    finding_id: "80000000-0000-4000-8000-000000000003",
    domain: "acme-demo.mx",
    score_id: "a0000000-0000-4000-8000-000000000001",
    computed_at: "2026-09-30T14:24:30-06:00",
    method: "rules",
    penalty: 18,
    max_penalty: 25,
    factors: [
      { label: "Versión con vulnerabilidades públicas conocidas", points: 12 },
      { label: "Servicio expuesto directo a internet", points: 6 },
    ],
    summary: "Es alto porque el sitio público usa una versión del CMS con fallas conocidas; aprovecharlas requiere un paso más, pero ya hay guías públicas.",
    recommendation: "Actualiza el CMS a la versión con soporte más reciente y revisa sus complementos.",
    confidence: null,
    shap: null,
  },
  "80000000-0000-4000-8000-000000000004": {
    finding_id: "80000000-0000-4000-8000-000000000004",
    domain: "acme-demo.mx",
    score_id: "a0000000-0000-4000-8000-000000000001",
    computed_at: "2026-09-30T14:24:30-06:00",
    method: "rules",
    penalty: 7,
    max_penalty: 10,
    factors: [
      { label: "El dominio recibe correo (tiene MX)", points: 5 },
      { label: "Sin cambios desde el escaneo anterior", points: 2 },
    ],
    summary: "Es medio porque facilita que alguien envíe correos haciéndose pasar por la empresa, aunque no da acceso por sí solo.",
    recommendation: "Publica un registro DMARC en _dmarc.acme-demo.mx, empezando con p=none para monitorear.",
    confidence: null,
    shap: null,
  },
};

/** Registro TXT que cada dominio debe publicar (solo Admin). */
export const mockTxtVerifications: ListResponse<TxtVerification> = {
  items: [
    { fqdn: "acme-demo.mx", status: "verified", expected_value: "cirdan-verification=c41d7e2a9b06", checked_at: "2026-09-30T14:19:20-06:00" },
    { fqdn: "acme-tienda.mx", status: "verified", expected_value: "cirdan-verification=5e9a1f3c7d28", checked_at: "2026-09-29T09:11:30-06:00" },
    { fqdn: "acme-portal.mx", status: "verified", expected_value: "cirdan-verification=a2b8c6e4f019", checked_at: "2026-09-27T18:44:10-06:00" },
    { fqdn: "partner-example.com", status: "missing", expected_value: "cirdan-verification=8f3c2a91e7b4", checked_at: "2026-10-01T16:10:00-06:00" },
    { fqdn: "old-example.net", status: "verified", expected_value: "cirdan-verification=3d7f9b1e5c82", checked_at: "2026-10-01T06:00:00-06:00" },
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
    { id: "c0000000-0000-4000-8000-000000000006", occurred_at: "2026-09-30T14:47:00-06:00", actor_type: "user", actor: "gerente@cirdan.test", action: "report.downloaded", entity_type: "report", details: { kind: "pdf_report" } },
    { id: "c0000000-0000-4000-8000-000000000005", occurred_at: "2026-09-30T14:25:00-06:00", actor_type: "system", actor: null, action: "alert.created", entity_type: "alert", details: { event_type: "score.above_threshold", score: 68 } },
    { id: "c0000000-0000-4000-8000-000000000004", occurred_at: "2026-09-30T14:24:30-06:00", actor_type: "system", actor: null, action: "finding.severity_changed", entity_type: "finding", details: { from: "high", to: "critical" } },
    { id: "c0000000-0000-4000-8000-000000000003", occurred_at: "2026-09-15T11:02:00-06:00", actor_type: "user", actor: "gerente@cirdan.test", action: "organization.threshold_changed", entity_type: "organization", details: { alert_score_threshold: 60 } },
    { id: "c0000000-0000-4000-8000-000000000002", occurred_at: "2026-09-01T09:55:00-06:00", actor_type: "user", actor: "admin@cirdan.test", action: "authorization.uploaded", entity_type: "domain_authorization", details: { fqdn: "acme-demo.mx", valid_until: "2026-12-31" } },
    { id: "c0000000-0000-4000-8000-000000000001", occurred_at: "2026-09-01T09:40:00-06:00", actor_type: "user", actor: "admin@cirdan.test", action: "domain.added", entity_type: "domain", details: { fqdn: "acme-demo.mx" } },
  ],
  total: 6,
};
