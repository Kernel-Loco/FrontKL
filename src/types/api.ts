// Tipos de la API v1 de FastAPI (/api/v1). Replican el contrato de BackKL
// (docs/contrato_api_v1.md, #21) campo por campo, en snake_case, para no mapearlos.
// Los valores son los códigos de la base; los nombres en español están en src/config/labels.ts.
//
// Las secciones marcadas «Provisional» todavía no están en el contrato #21: salen del
// esquema de la base y se agregarán al contrato cuando se implementen sus endpoints.
// Los campos marcados «Propuesto» son campos nuevos en endpoints del contrato que piden
// las pantallas de Lowtide; hay que agregarlos también en BackKL (docs/api_v1/).
import type { Role } from "./auth";
import type { FindingSource, Severity } from "./findings";

/** Respuesta de toda lista de la API. */
export interface ListResponse<T> {
  items: T[];
  total: number;
}

/** Error de FastAPI. */
export interface ApiErrorBody {
  detail: string;
}

// ---------------------------------------------------------------- score y criterio (#29)

export type Band = "low" | "medium" | "high" | "critical";
export type Category = "infrastructure" | "digital_identity" | "configuration" | "data_leaks";
export type ScoreMethod = "rules" | "ml";
export type ScoreReason = "scan" | "intel_update" | "rules_change";

// ---------------------------------------------------------------- dominios (dominios.json)

export type DomainStatus = "pending_verification" | "verified" | "paused" | "removed";
export type AuthorizationStatus = "valid" | "expired" | "revoked" | "missing";
export type TxtStatus = "verified" | "missing";
export type ScanBlockReason =
  | "authorization_missing"
  | "authorization_not_started"
  | "authorization_expired"
  | "authorization_revoked"
  | "txt_not_verified"
  | "domain_paused"
  | "domain_removed"
  | "domain_not_found"
  | "scan_in_progress"
  | "live_scan_not_allowed";

export type SeverityCounts = Record<Severity, number>;

/** `GET /api/v1/domains` */
export interface Domain {
  id: string;
  fqdn: string;
  status: DomainStatus;
  authorization: {
    status: AuthorizationStatus;
    valid_from: string | null;
    valid_until: string | null;
    /** Propuesto: correo de quien firmó la autorización. */
    signer_email: string | null;
  };
  txt: { status: TxtStatus; checked_at: string | null };
  /** `can_scan` solo con autorización vigente, TXT verificado y dominio verificado. */
  scan_eligibility: { can_scan: boolean; reasons: ScanBlockReason[] };
  score: number | null;
  band: Band | null;
  open_findings: SeverityCounts;
  last_scan_at: string | null;
  next_scan_at: string | null;
}

// ---------------------------------------------------------------- hallazgos (hallazgos.json)

export type FindingStatus = "open" | "resolved" | "accepted_risk" | "false_positive";
export type Recurrence = "new" | "recurring";
export type AssetType = "domain" | "subdomain" | "ip" | "service" | "certificate" | "email";

/** Las 4 características del reto, con las claves del contrato de plugin (#13). */
export interface Caracteristicas {
  tipo: string;
  antiguedad_dias: number;
  exposicion: "directa" | "publica";
  sensibilidad: "baja" | "media" | "alta";
}

/** `GET /api/v1/domains/{fqdn}/findings` */
export interface DomainFinding {
  id: string;
  title: string;
  asset: string;
  asset_type: AssetType;
  category: Category;
  rule_code: string;
  source: FindingSource;
  severity: Severity;
  base_severity: Severity;
  status: FindingStatus;
  recurrence: Recurrence;
  cve_id: string | null;
  cvss: number | null;
  epss: number | null;
  in_kev: boolean;
  evidence: Record<string, unknown>;
  caracteristicas: Caracteristicas;
  detected_at: string;
  last_scan_id: string | null;
}

export interface DomainFindings extends ListResponse<DomainFinding> {
  domain: string;
}

// ---------------------------------------------------------------- score (score.json, historico.json)

interface ScoreBase {
  score_id: string;
  score: number;
  band: Band;
  weighted: number;
  floor: number;
  /** El piso por hallazgos críticos subió el score: el portal muestra el aviso. */
  floor_applied: boolean;
  critical_open: number;
  method: ScoreMethod;
  rule_set_version: number;
  reason: ScoreReason;
  partial_coverage: boolean;
  computed_at: string;
}

export interface CategoryScore {
  category: Category;
  score: number;
  band: Band;
  weight: number;
}

/** `GET /api/v1/domains/{fqdn}/score` */
export interface DomainScore extends ScoreBase {
  domain: string;
  categories: CategoryScore[];
  alert: { threshold: number; triggered: boolean };
}

export interface ScoreHistoryPoint extends ScoreBase {
  categories: Record<Category, number>;
  /** Propuesto: hallazgos que aparecieron y que se resolvieron en ese escaneo. */
  new_findings: number;
  resolved_findings: number;
}

/** `GET /api/v1/domains/{fqdn}/score/history`, del más viejo al más nuevo. */
export interface ScoreHistory extends ListResponse<ScoreHistoryPoint> {
  domain: string;
}

// ---------------------------------------------------------------- plan de acción y simulador (#42, #70)

export interface PlanAction {
  id: string;
  rule_code: string;
  category: Category;
  recommendation: string;
  finding_ids: string[];
  finding_count: number;
  score_after: number;
  score_reduction: number;
}

/** `GET /api/v1/domains/{fqdn}/action-plan` */
export interface ActionPlan {
  domain: string;
  score_before: number;
  band_before: Band;
  category_scores_before: Record<Category, number>;
  method: ScoreMethod;
  partial_coverage: boolean;
  actions: PlanAction[];
  total: number;
}

/** `POST /api/v1/domains/{fqdn}/action-plan/simulate` */
export interface ActionPlanSimulation {
  domain: string;
  action_ids: string[];
  score_before: number;
  score_after: number;
  score_reduction: number;
  band_before: Band;
  band_after: Band;
  category_scores_before: Record<Category, number>;
  category_scores_after: Record<Category, number>;
  floor_message_after: string | null;
  method: ScoreMethod;
  partial_coverage: boolean;
}

// ---------------------------------------------------------------- explicación (explicacion.json)

export interface ExplanationFactor {
  label: string;
  points: number;
}

export interface ShapContribution {
  feature: string;
  value: string | number;
  contribution: number;
}

/** `GET /api/v1/findings/{id}/explanation` */
export interface FindingExplanation {
  finding_id: string;
  domain: string;
  title: string;
  severity: Severity;
  base_severity: Severity;
  category: Category;
  rule_code: string;
  score_id: string;
  computed_at: string;
  method: ScoreMethod;
  penalty: number;
  max_penalty: number;
  factors: ExplanationFactor[];
  caracteristicas: Caracteristicas;
  summary: string;
  /** Propuesto: qué hacer para corregirlo, en lenguaje simple. */
  recommendation: string;
  /** Solo con `method = "ml"`: confianza del clasificador en la severidad (0–1). */
  confidence: number | null;
  /** Solo con `method = "ml"` (#35). */
  shap: ShapContribution[] | null;
}

// ---------------------------------------------------------------- pesos (pesos.json)

export interface ScoringRule {
  code: string;
  category: Category;
  base_severity: Severity;
  weight: number;
  max_penalty: number;
}

/** `GET /api/v1/scoring/weights` */
export interface ScoringWeights {
  rule_set_version: number;
  is_active: boolean;
  activated_at: string;
  validated_by: string | null;
  category_weights: Record<Category, number>;
  bands: { band: Band; from: number; to: number }[];
  floor: { one_critical: number; two_or_more_critical: number; counts_statuses: FindingStatus[] };
  alert_threshold_default: number;
  rules: ScoringRule[];
}

// ---------------------------------------------------------------- Provisional: activos (tabla assets)

/** `GET /api/v1/domains/{fqdn}/assets` */
export interface Asset {
  id: string;
  type: AssetType;
  value: string;
  /** Valor del activo padre: el subdominio de una IP, la IP de un servicio. */
  parent: string | null;
  attributes: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
}

// ---------------------------------------------------------------- Provisional: escaneos (scans, scan_source_runs)

export type ScanStatus = "queued" | "running" | "completed" | "partial" | "failed";
export type ScanTrigger = "scheduled" | "on_demand" | "api";
export type SourceRunStatus = "pending" | "running" | "succeeded" | "retrying" | "failed";

export interface ScanSourceRun {
  source: FindingSource;
  status: SourceRunStatus;
  attempt: number;
  error: string | null;
  finished_at: string | null;
}

/** `GET /api/v1/scans` */
export interface Scan {
  id: string;
  domain: string;
  trigger: ScanTrigger;
  status: ScanStatus;
  queued_at: string;
  finished_at: string | null;
  stats: { assets: number; new_findings: number; resolved_findings: number } | null;
  sources: ScanSourceRun[];
}

/** `POST /api/v1/domains/{fqdn}/scans`. Si no se puede escanear, la API responde 409 con `detail`. */
export type ScanRequestResult = { accepted: true; scan: Scan } | { accepted: false; detail: string; reasons: ScanBlockReason[] };

// ---------------------------------------------------------------- Provisional: reportes (reports)

export type ReportKind = "weekly_summary" | "pdf_report" | "html_report";
export type ReportStatus = "pending" | "generating" | "ready" | "failed";
export type ReportFormat = "pdf" | "html";

/** `GET /api/v1/reports` */
export interface Report {
  id: string;
  kind: ReportKind;
  /** `null` cuando el reporte cubre todos los dominios de la empresa. */
  domain: string | null;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  generated_at: string | null;
  download_url: string | null;
}

/** `POST /api/v1/reports` */
export interface ReportRequest {
  domain: string | null;
  period_start: string;
  period_end: string;
  format: ReportFormat;
}

// ---------------------------------------------------------------- Provisional: usuarios y perfil (users)

/** `GET /api/v1/users` (solo Admin) y `GET /api/v1/me` */
export interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  mfa_enabled: boolean;
  is_active: boolean;
  last_login_at: string | null;
}

/** `POST /api/v1/users/invitations` */
export interface InviteRequest {
  full_name: string;
  email: string;
  role: Role;
}

// ---------------------------------------------------------------- Provisional: configuración (organizations, integrations, api_keys)

export type IntegrationKind = "webhook" | "siem_cef" | "email";

export interface Integration {
  id: string;
  kind: IntegrationKind;
  name: string;
  endpoint: string;
  enabled: boolean;
  events: string[];
}

/** La llave completa solo se muestra una vez al crearla; aquí solo viaja su prefijo. */
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

/** `GET /api/v1/settings` */
export interface OrgSettings {
  organization_name: string;
  plan: string;
  alert_score_threshold: number;
  integrations: Integration[];
  api_keys: ApiKey[];
}

// ---------------------------------------------------------------- Provisional: alta de dominios y TXT (Admin)

export type ScopeCategory = Category;

/** `POST /api/v1/domains` (solo Admin). La carta firmada viaja como archivo aparte. */
export interface DomainRegistrationRequest {
  fqdn: string;
  organization: string;
  signer_email: string;
  valid_from: string;
  valid_until: string;
  scope: ScopeCategory[];
  /** Confirmación de que la organización autorizó el monitoreo pasivo. */
  passive_monitoring_confirmed: true;
}

/** `GET /api/v1/domains/txt` (solo Admin): el registro que cada dominio debe publicar. */
export interface TxtVerification {
  fqdn: string;
  status: TxtStatus;
  expected_value: string;
  checked_at: string | null;
}

// ---------------------------------------------------------------- Provisional: políticas de alerta

export type AlertEvent =
  | "score.above_threshold"
  | "finding.created"
  | "finding.resolved"
  | "authorization.expiring"
  | "scan.partial";

export interface AlertPolicy {
  event: AlertEvent;
  enabled: boolean;
  /** Solo para eventos de hallazgos: severidad mínima que dispara la alerta. */
  min_severity: Severity | null;
}

/** `GET/PUT /api/v1/alert-policies` */
export interface AlertPolicies {
  alert_score_threshold: number;
  policies: AlertPolicy[];
}

// ---------------------------------------------------------------- Provisional: llaves de API y webhooks

/** `POST /api/v1/api-keys`. Vigencia máxima de 90 días. */
export interface ApiKeyRequest {
  name: string;
  scopes: string[];
  expires_in_days: number;
}

/** La llave completa solo viaja en esta respuesta; después solo se ve su prefijo. */
export interface ApiKeyCreated {
  api_key: ApiKey;
  secret: string;
}

/** `POST /api/v1/integrations` */
export interface IntegrationRequest {
  kind: IntegrationKind;
  name: string;
  endpoint: string;
  events: string[];
}

// ---------------------------------------------------------------- Provisional: bitácora (audit_log)

export type AuditActorType = "user" | "system" | "api_key";

/** `GET /api/v1/audit-log` (solo Admin), del más nuevo al más viejo. */
export interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_type: AuditActorType;
  /** Nombre o correo de quien lo hizo; `null` para el sistema. */
  actor: string | null;
  action: string;
  entity_type: string | null;
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------- Provisional: perfil

/** `POST /api/v1/me/password` */
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}
