// Nombres en español de los códigos que devuelve la API (que usa los códigos de la base).
import type {
  AlertEvent,
  AssetType,
  AuditActorType,
  AuthorizationStatus,
  Band,
  Caracteristicas,
  Category,
  DomainStatus,
  FindingSource,
  FindingStatus,
  IntegrationKind,
  Recurrence,
  ReportFormat,
  ReportKind,
  ReportStatus,
  ScanBlockReason,
  ScanStatus,
  ScanTrigger,
  ScoreMethod,
  ScoreReason,
  Severity,
  SourceRunStatus,
  TxtStatus,
} from "@/types";

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const SOURCE_LABELS: Record<FindingSource, string> = {
  ct_logs: "crt.sh",
  dns: "DNS",
  whois: "WHOIS",
  shodan: "Shodan",
  github: "GitHub",
  censys: "Censys",
  hibp: "HIBP API",
};

/** Bandas del score (criterio #29): bajo 0–39, medio 40–59, alto 60–79, crítico 80–100. */
export const BAND_LABELS: Record<Band, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

/** Las 4 categorías del reto, en el orden en que se muestran. */
export const CATEGORY_LABELS: Record<Category, string> = {
  infrastructure: "Infraestructura",
  digital_identity: "Identidad digital",
  configuration: "Configuración",
  data_leaks: "Fugas de datos",
};

export const SCORE_METHOD_LABELS: Record<ScoreMethod, string> = {
  rules: "Reglas",
  ml: "Modelo de ML",
};

export const SCORE_REASON_LABELS: Record<ScoreReason, string> = {
  scan: "Escaneo",
  intel_update: "Recálculo por información de amenazas nueva",
  rules_change: "Recálculo por cambio de reglas",
  correction: "Corrección del score guardado",
};

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  pending_verification: "Pendiente de verificar",
  verified: "Verificado",
  paused: "En pausa",
  removed: "Eliminado",
};

export const AUTHORIZATION_STATUS_LABELS: Record<AuthorizationStatus, string> = {
  valid: "Vigente",
  expired: "Vencida",
  revoked: "Revocada",
  missing: "Sin autorización",
};

export const TXT_STATUS_LABELS: Record<TxtStatus, string> = {
  verified: "Verificado",
  missing: "No encontrado",
};

/** Por qué no se puede escanear un dominio. */
export const SCAN_BLOCK_REASON_LABELS: Record<ScanBlockReason, string> = {
  authorization_missing: "Falta la autorización firmada",
  authorization_not_started: "La autorización todavía no entra en vigor",
  authorization_expired: "La autorización venció",
  authorization_revoked: "La autorización fue revocada",
  txt_not_verified: "Falta verificar el registro TXT",
  domain_paused: "El dominio está en pausa",
  domain_removed: "El dominio fue eliminado",
  domain_not_found: "El dominio no está registrado",
  scan_in_progress: "Ya hay un escaneo en curso",
  live_scan_not_allowed: "Dominio de la demo: no se consulta en vivo",
};

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Abierto",
  resolved: "Resuelto",
  accepted_risk: "Riesgo aceptado",
  false_positive: "Falso positivo",
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  new: "Nuevo",
  recurring: "Recurrente",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  domain: "Dominio",
  subdomain: "Subdominio",
  ip: "IP",
  service: "Servicio",
  certificate: "Certificado",
  email: "Correo",
};

export const EXPOSICION_LABELS: Record<Caracteristicas["exposicion"], string> = {
  directa: "Directa (responde en internet)",
  publica: "Pública (dato público)",
};

export const SENSIBILIDAD_LABELS: Record<Caracteristicas["sensibilidad"], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const SCAN_STATUS_LABELS: Record<ScanStatus, string> = {
  queued: "En cola",
  running: "En curso",
  completed: "Completado",
  partial: "Parcial",
  failed: "Fallido",
};

export const SCAN_TRIGGER_LABELS: Record<ScanTrigger, string> = {
  scheduled: "Programado",
  on_demand: "Manual",
  api: "API",
};

export const SOURCE_RUN_STATUS_LABELS: Record<SourceRunStatus, string> = {
  pending: "Pendiente",
  running: "En curso",
  succeeded: "Correcto",
  retrying: "Reintentando",
  failed: "Falló",
};

export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  weekly_summary: "Resumen semanal",
  pdf_report: "Reporte ejecutivo (PDF)",
  html_report: "Reporte ejecutivo (HTML)",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pendiente",
  generating: "Generando",
  ready: "Listo",
  failed: "Falló",
};

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  html: "HTML",
};

export const INTEGRATION_KIND_LABELS: Record<IntegrationKind, string> = {
  webhook: "Webhook",
  siem_cef: "SIEM (CEF)",
  email: "Correo",
};

export const ALERT_EVENT_LABELS: Record<AlertEvent, { label: string; description: string }> = {
  "score.above_threshold": { label: "Score en el umbral o arriba", description: "Cada cálculo en que el score de un dominio llega al umbral o lo pasa." },
  "finding.created": { label: "Hallazgo nuevo", description: "Un escaneo encuentra un hallazgo que no existía." },
  "finding.resolved": { label: "Hallazgo resuelto", description: "Un hallazgo deja de aparecer en el escaneo." },
  "authorization.expiring": { label: "Autorización por vencer", description: "Faltan 30 días o menos para que venza la autorización firmada de un dominio." },
  "scan.partial": { label: "Escaneo parcial", description: "Alguna fuente falló después de sus reintentos o hay reglas que las fuentes todavía no pueden revisar, así que el score puede estar incompleto." },
};

export const AUDIT_ACTOR_LABELS: Record<AuditActorType, string> = {
  user: "Usuario",
  system: "Sistema",
  api_key: "Llave de API",
};

/** Acciones de la bitácora (audit_log.action). Las que no estén aquí se muestran con su código. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "domain.added": "Registró un dominio",
  "authorization.uploaded": "Subió una autorización firmada",
  "organization.threshold_changed": "Cambió el umbral de alerta",
  "finding.severity_changed": "Cambió la severidad de un hallazgo",
  "alert.created": "Creó una alerta",
  "report.downloaded": "Descargó un reporte",
  "user.invited": "Invitó a un usuario",
  "user.role_changed": "Cambió el rol de un usuario",
  "api_key.created": "Creó una llave de API",
  "api_key.revoked": "Revocó una llave de API",
  "chain.verified": "Verificó la integridad de la bitácora",
};

export const API_SCOPE_LABELS: Record<string, string> = {
  "findings:read": "Leer hallazgos",
  "scores:read": "Leer scores",
  "domains:read": "Leer dominios",
  "reports:read": "Leer reportes",
  "scans:write": "Lanzar escaneos",
};
