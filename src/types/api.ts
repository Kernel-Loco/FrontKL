// Tipos de la API v1 de FastAPI (/api/v1). Replican el contrato de BackKL
// (docs/contrato_api_v1.md, #21) campo por campo, en snake_case, para no mapearlos.
// Los valores son los códigos de la base; los nombres en español están en src/config/labels.ts.
//
// Las secciones marcadas «Provisional» todavía no están en el contrato #21: salen del
// esquema de la base y se agregarán al contrato cuando se implementen sus endpoints.
// Los campos marcados «Propuesto» son campos nuevos en endpoints del contrato que piden
// las pantallas de LowTide; hay que agregarlos también en BackKL (docs/api_v1/).
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
/** Letra del score final (#114). Con la plantilla: A 0–19, B 20–39, C 40–59, D 60–79, F 80–100. No hay E. La da la API
 * con los cortes de bandas del juego de cada score (RC-237). */
export type Grade = "A" | "B" | "C" | "D" | "F";
export type Category = "infrastructure" | "digital_identity" | "configuration" | "data_leaks";
export type ScoreMethod = "rules" | "ml";
export type ScoreReason = "scan" | "intel_update" | "rules_change" | "correction";

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
    /** Versión de la plantilla y actividades del Anexo A de la carta (RC-59). Opcionales en los datos de ejemplo. */
    template_version?: number | null;
    activities?: number[] | null;
  };
  txt: { status: TxtStatus; checked_at: string | null };
  /** `can_scan` solo con autorización vigente, TXT verificado y dominio verificado. */
  scan_eligibility: { can_scan: boolean; reasons: ScanBlockReason[] };
  score: number | null;
  band: Band | null;
  grade: Grade | null;
  open_findings: SeverityCounts;
  last_scan_at: string | null;
  next_scan_at: string | null;
}

// ---------------------------------------------------------------- hallazgos (hallazgos.json)

export type FindingStatus = "open" | "resolved" | "accepted_risk" | "false_positive";
export type Recurrence = "new" | "recurring";
/** Los de TIPOS_ACTIVO de BackKL cirdan/recolectores/contrato.py. api_doc es la URL de una documentación de API. */
export type AssetType = "domain" | "subdomain" | "ip" | "service" | "certificate" | "email" | "api_doc";

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
  /** null con CVE que el cargador diario de inteligencia de BackKL todavía no revisó: no se sabe si está en KEV. */
  in_kev: boolean | null;
  evidence: Record<string, unknown>;
  /** Lo entrega el backend. El simulado no lo trae. */
  frameworks?: Frameworks;
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
  /** Con `partial_coverage` lleva el mismo aviso que el score. */
  grade: Grade;
  weighted: number;
  floor: number;
  /** El piso por hallazgos críticos subió el score: el portal muestra el aviso. */
  floor_applied: boolean;
  floor_message: string | null;
  critical_open: number;
  method: ScoreMethod;
  model_version: string | null;
  model_fallback_reason: string | null;
  rule_set_version: number;
  reason: ScoreReason;
  partial_coverage: boolean;
  /** Fuentes que la empresa tenía apagadas en el escaneo de este score (RC-235). Explican partial_coverage. */
  disabled_sources?: string[];
  computed_at: string;
}

export interface CategoryScore {
  category: Category;
  score: number;
  band: Band;
  weight: number;
}

/** Hallazgos vigentes y aportes de una subcategoría (#114). `other` junta las reglas que el mapa no conoce. */
export interface SubcategoryScore {
  category: Category;
  subcategory: string;
  name: string;
  findings: number;
  penalty: number;
}

/**
 * ok: sus fuentes corrieron completas. partial: hay datos, pero no de todo. no_coverage: alguna fuente no
 * respondió o nada se revisó. no_source_yet: aún no tiene fuente. Con los dos últimos los conteos van en null.
 */
export type KriStatus = "ok" | "partial" | "no_coverage" | "no_source_yet";

/** Indicador clave de riesgo (#114). Los KRI no cubren todo el score. */
export interface Kri {
  kri: string;
  name: string;
  status: KriStatus;
  subcategories: string[];
  sources: string[];
  sources_failed: string[];
  sources_not_run: string[];
  sources_partial: string[];
  rules_without_coverage: string[];
  findings: number | null;
  max_severity: Severity | null;
  penalty: number | null;
}

/**
 * Por qué el escaneo del score no revisó un código (RC-229). source_failed: la fuente no respondió. source_not_run: no
 * corrió en ese escaneo (apagada o aún no existía). no_api_key: Shodan sin la API de host o HIBP sin la llave de la
 * plataforma (RC-54). source_partial: la fuente respondió pero no pudo revisarlo. partially_checked: la fuente revisó
 * solo una parte de lo suyo (sources_partial). source_disabled_by_org: la empresa apagó la fuente en Fuentes (RC-235).
 */
export type CoverageGapReason =
  | "source_failed"
  | "source_not_run"
  | "source_disabled_by_org"
  | "no_api_key"
  | "source_partial"
  | "partially_checked";

/** Un código de regla que el escaneo del score no revisó, con su fuente (null si no se sabe) y su motivo. */
export interface CoverageGap {
  code: string;
  source: string | null;
  reason: CoverageGapReason;
}

/** `GET /api/v1/domains/{fqdn}/score` */
export interface DomainScore extends ScoreBase {
  domain: string;
  categories: CategoryScore[];
  subcategories: SubcategoryScore[];
  kris: Kri[];
  kri_map_version: number;
  /** Códigos sin cobertura del escaneo del score, ordenados por código (RC-229). Vacía sin corridas. Falta con una API de antes. */
  coverage_gaps?: CoverageGap[];
  /** El umbral compara el score de 0 a 100, nunca la letra. */
  alert: { threshold: number; triggered: boolean };
}

export interface ScoreHistoryPoint extends ScoreBase {
  categories: Record<Category, number>;
  /** Hallazgos que el escaneo abrió y que resolvió. 0 en un recálculo y null si su escaneo no los contó (antes de RC-55). */
  new_findings: number | null;
  resolved_findings: number | null;
  /** Cambios frente al escaneo anterior (#37, RC-73). null en un recálculo y en un escaneo sin novedades. */
  weekly_changes: WeeklyChanges | null;
}

/**
 * `weekly_changes` de cirdan/score/cambios.py: activos y hallazgos nuevos del escaneo y crecimiento del inventario
 * en la semana: contra el escaneo más viejo de los 7 días anteriores o, si no hay, el anterior más reciente de hasta
 * 14 días (RC-73). `assets_growth_percent` y `assets_before` son null sin ese escaneo de base.
 */
export interface WeeklyChanges {
  previous_scan_id: string | null;
  previous_scan_at: string | null;
  assets_before: number | null;
  assets_now: number | null;
  new_assets: number;
  assets_growth_percent: number | null;
  new_findings: number;
  alerts: { new_asset: boolean; new_finding: boolean; assets_growth_over_20_percent: boolean };
}

/** `GET /api/v1/domains/{fqdn}/score/history`, del más viejo al más nuevo. */
export interface ScoreHistory extends ListResponse<ScoreHistoryPoint> {
  domain: string;
}

// ---------------------------------------------------------------- comparación de dos scores (#24, RC-57)

/** new: está en `hasta` y no en `desde`. gone: al revés. kept: está en los dos. */
export type ComparisonChange = "new" | "gone" | "kept";

export interface ComparisonPoint {
  score_id: string;
  scan_id: string;
  score: number;
  reason: ScoreReason;
  partial_coverage: boolean;
  computed_at: string;
}

export interface ComparisonItem {
  finding_id: string;
  change: ComparisonChange;
  severity_changed: boolean;
  title: string;
  rule_code: string;
  category: Category;
  asset: string;
  asset_type: AssetType;
  severity_from: Severity | null;
  severity_to: Severity | null;
  penalty_from: number | null;
  penalty_to: number | null;
  /** Estado de hoy. `gone` no dice por qué ya no está. */
  status_now: FindingStatus;
}

/** `GET /api/v1/domains/{fqdn}/score/compare?desde=<score_id>&hasta=<score_id>`. 403 sin autorización vigente. */
export interface ScoreComparison extends ListResponse<ComparisonItem> {
  domain: string;
  from: ComparisonPoint;
  to: ComparisonPoint;
  summary: Record<ComparisonChange, number> & { severity_changed: number };
}

// ---------------------------------------------------------------- plan de acción y simulador (#42, #70)

/** Cómo agrupa el plan: por regla (lo de siempre) o por activo, una acción por activo (dominio, subdominio, IP,
 * servicio u otro, RC-263). Por activo es solo para analista y admin, como Hallazgos. */
export type PlanGrouping = "regla" | "activo";

interface PlanActionBase {
  id: string;
  category: Category;
  finding_ids: string[];
  finding_count: number;
  /** Resolviéndola sola. */
  score_after: number;
  score_reduction: number;
  /** Resolviéndola después de todas las de arriba (RC-263). La última deja el score de resolver todo. */
  score_after_acumulado: number;
  score_reduction_acumulado: number;
}

export interface PlanAction extends PlanActionBase {
  rule_code: string;
  recommendation: string;
}

export interface PlanAssetRecommendation {
  rule_code: string;
  category: Category;
  recommendation: string;
}

/** Con `agrupar=activo`: `id` es el del activo y junta los hallazgos de todas sus reglas. */
export interface PlanAssetAction extends PlanActionBase {
  asset_id: string;
  /** El backend también tiene perfiles (cirdan/recolectores/contrato.py), que el inventario de activos no lista. */
  asset_type: AssetType | "profile";
  asset_value: string;
  recommendations: PlanAssetRecommendation[];
  rule_codes: string[];
  categories: Category[];
}

interface ActionPlanBase {
  domain: string;
  score_before: number;
  band_before: Band;
  category_scores_before: Record<Category, number>;
  method: ScoreMethod;
  partial_coverage: boolean;
  total: number;
}

/** `GET /api/v1/domains/{fqdn}/action-plan?agrupar=regla|activo` */
export type ActionPlan =
  | (ActionPlanBase & { grouping: "regla"; actions: PlanAction[] })
  | (ActionPlanBase & { grouping: "activo"; actions: PlanAssetAction[] });

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

// ---------------------------------------------------------------- marcos de referencia (#83, RC-131)

/** Técnica de MITRE ATT&CK, control de ISO 27001:2022 y salvaguarda de CIS v8.1 de la regla del hallazgo. */
export interface Frameworks {
  mitre_attack: {
    version: string;
    technique_id: string | null;
    technique_name: string | null;
    source_url: string | null;
    /** Sin técnica: por qué la regla no mapea a ATT&CK. */
    unmapped_reason: string | null;
  };
  iso_27001_2022: { version: string; control_id: string; control_name: string; source_url: string | null };
  cis_controls_v8_1: { version: string; safeguard_id: string; safeguard_name: string; source_url: string | null };
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
  /** Nombre y significado de la regla (scoring_rule_texts). El simulado no los trae. */
  rule_title?: string;
  meaning?: string;
  score_id: string;
  computed_at: string;
  method: ScoreMethod;
  /** Versión del modelo del score, solo con `method = "ml"`. */
  model_version?: string | null;
  /** Por qué el score más reciente usó reglas (MODEL_FALLBACK_LABELS); null con ML. La API lo da desde RC-229. */
  model_fallback_reason?: string | null;
  penalty: number;
  max_penalty: number;
  factors: ExplanationFactor[];
  caracteristicas: Caracteristicas;
  summary: string;
  /** Propuesto: qué hacer para corregirlo, en lenguaje simple. */
  recommendation: string;
  /** Solo con `method = "ml"`: confianza del clasificador en la severidad (0–1). */
  confidence: number | null;
  /** Solo con `method = "ml"`: clase que predijo el modelo. El SHAP es de esta clase (RC-71). */
  model_prediction?: Severity | null;
  /** Solo con `method = "ml"` (#35). */
  shap: ShapContribution[] | null;
  /** Modelo que dio la confianza y el SHAP. Puede venir también con `method = "rules"`, si el modelo no se integró. */
  explanation_model_version?: string | null;
  /** Lo entrega el backend. El simulado no lo trae. */
  frameworks?: Frameworks;
}

// ---------------------------------------------------------------- pesos (pesos.json)

export interface ScoringRule {
  code: string;
  category: Category;
  base_severity: Severity;
  weight: number;
  max_penalty: number;
  /** Nombre, significado y recomendación de la regla (scoring_rule_texts). El simulado no los trae. */
  title?: string;
  meaning?: string;
  recommendation?: string;
}

/** Dónde empiezan las bandas medio, alto y crítico de un juego de reglas (RC-237). El bajo empieza en 0. */
export interface BandCutoffs {
  medium: number;
  high: number;
  critical: number;
}

/** Rango de una banda como lo manda la API. */
export interface BandRange {
  band: Band;
  from: number;
  to: number;
}

/** `GET /api/v1/scoring/weights` */
export interface ScoringWeights {
  rule_set_version: number;
  is_active: boolean;
  activated_at: string;
  validated_by: string | null;
  category_weights: Record<Category, number>;
  /** Los del juego activo de la organización (RC-237). `bands`, `grades` y `floor` salen de ellos. */
  band_cutoffs: BandCutoffs;
  /** Los de la plantilla global: 40, 60 y 80. */
  band_cutoffs_template: BandCutoffs;
  bands: BandRange[];
  grades: { grade: Grade; from: number; to: number }[];
  floor: { one_critical: number; two_or_more_critical: number; counts_statuses: FindingStatus[] };
  alert_threshold_default: number;
  rules: ScoringRule[];
}

/** `PUT /api/v1/scoring/weights` */
export interface ScoringWeightsUpdateResult {
  rule_set_version: number;
  category_weights: Record<Category, number>;
  band_cutoffs: BandCutoffs;
  recalculated_domains: number;
  /** Dominios con score de ML sin severidades guardadas que un PUT con los mismos pesos no pudo poner al día (RC-310). */
  skipped_domains?: number;
  unchanged: boolean;
}

// ---------------------------------------------------------------- Activos (tabla assets, RC-231)

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

/** `GET /api/v1/assets`: el inventario de toda la empresa, paginado (RC-231). */
export interface OrganizationAsset extends Asset {
  domain: string;
  /** La IP del activo (la de un `ip` o la de un `service`); null en los demás. */
  ip: string | null;
  parent_type: AssetType | null;
}

export interface OrganizationAssets extends ListResponse<OrganizationAsset> {
  limit: number;
  offset: number;
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

// ---------------------------------------------------------------- Alta de dominios y TXT (Admin)

export type ScopeCategory = Category;

/** Estado de una carta mandada a firmar con Mifiel (RC-211, tabla signature_requests). */
export type SignatureRequestStatus =
  | "creating"
  | "sent"
  | "signed"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired"
  | "failed";

/** `GET /api/v1/signature-requests` y la respuesta de enviar, consultar, cancelar y confirmar (solo Admin). */
export interface SignatureRequest {
  id: string;
  fqdn: string;
  provider: "mifiel";
  environment: "sandbox" | "production";
  status: SignatureRequestStatus;
  /** Nombre, cargo y correo de quien firma: null fuera de creating, sent o signed o con la carta vencida (RC-274). */
  signer_name: string | null;
  signer_title: string | null;
  signer_email: string | null;
  valid_from: string;
  valid_until: string;
  template_version: number;
  activities: number[];
  signed_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

export interface SignatureRequestList {
  items: SignatureRequest[];
  total: number;
  /** Modo de la API: off (solo se puede subir lo firmado en la web de Mifiel), sandbox o production. */
  mode: "off" | "sandbox" | "production";
}

/** `POST /api/v1/domains` (solo Admin). La carta se añade en el servicio. */
export interface DomainRegistrationRequest {
  fqdn: string;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  valid_from: string;
  valid_until: string;
  /** Confirmación de que la organización autorizó el monitoreo pasivo. */
  passive_monitoring_confirmed: true;
  /** Versión de la plantilla de la carta. Hoy solo existe la 1. */
  template_version: 1;
  /** Actividades del Anexo A que autoriza la carta (1 a 11). */
  activities: number[];
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
  /**
   * Declaración del Administrador de que la llave es para un sistema de su propia empresa, no de un
   * integrador ni de otra empresa. Obligatoria: el backend responde 422 si falta, es null o es false
   * (BackKL cirdan/api/llaves.py, RC-129).
   */
  own_use: true;
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

export type AuditActorType = "user" | "system" | "api_key" | "platform";

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

export interface PasswordChangeResponse {
  /** Passkeys que la API borró al cambiar la contraseña (RC-331): se registraron con la anterior. */
  passkeys_removed: number;
}

// ---------------------------------------------------------------- fuentes por cliente (RC-235)

/** Una fuente de `GET /api/v1/sources`. La empresa solo apaga: corre si está encendida en la plataforma y aquí. */
export interface SourceSetting {
  code: string;
  kind: "osint" | "intel";
  global_enabled: boolean;
  /** false: la empresa la apagó. true: la volvió a encender. null: nunca la cambió y sigue lo de la plataforma. */
  org_enabled: boolean | null;
  effective_enabled: boolean;
  can_change: boolean;
  changed_at: string | null;
  changed_by: string | null;
  changed_by_platform: boolean;
}
