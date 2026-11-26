// Lecturas del portal contra la API v1 de FastAPI (RC-17). Solo desde el servidor (páginas y
// layouts): la cookie de sesión viaja sola y RLS deja ver solo los datos de tu empresa.
// Las acciones de los botones (escanear, registrar, explicación) están en domainService.ts y
// scanService.ts, que corren en el navegador.
import { apiGet } from "@/lib/apiServer";
import type {
  Asset,
  ActionPlan,
  PlanGrouping,
  Domain,
  DomainFindings,
  DomainScore,
  ListResponse,
  OrganizationAssets,
  Scan,
  ScoreHistory,
  ScoringWeights,
  SignatureRequestList,
  SourceSetting,
  TxtVerification,
} from "@/types";

const path = (fqdn: string) => encodeURIComponent(fqdn);

export const getDomains = () => apiGet<ListResponse<Domain>>("/domains");

export const getDomainFindings = (fqdn: string) => apiGet<DomainFindings>(`/domains/${path(fqdn)}/findings`);

export const getDomainScore = (fqdn: string) => apiGet<DomainScore>(`/domains/${path(fqdn)}/score`);

export const getScoreHistory = (fqdn: string) => apiGet<ScoreHistory>(`/domains/${path(fqdn)}/score/history`);

export const getActionPlan = (fqdn: string, agrupar: PlanGrouping = "regla") =>
  apiGet<ActionPlan>(`/domains/${path(fqdn)}/action-plan${agrupar === "activo" ? "?agrupar=activo" : ""}`);

export const getDomainAssets = (fqdn: string) => apiGet<ListResponse<Asset>>(`/domains/${path(fqdn)}/assets`);

/**
 * Inventario de toda la empresa (RC-231). `query` sale de consultaActivos() (src/lib/filtrosActivos.ts): domain, type,
 * q, limit y offset. `total` cuenta todos los del filtro, no solo la página.
 */
export const getAssets = (query: string) => apiGet<OrganizationAssets>(query ? `/assets?${query}` : "/assets");

/** Solo Admin. */
export const getTxtVerifications = () => apiGet<ListResponse<TxtVerification>>("/domains/txt");

/** Cartas mandadas a firmar con Mifiel y el modo de la API (RC-211, solo Admin). */
export const getSignatureRequests = () => apiGet<SignatureRequestList>("/signature-requests");

export const getScoringWeights = () => apiGet<ScoringWeights>("/scoring/weights");

/** Fuentes con su estado global y el de la empresa (RC-235). Solo Admin. */
export const getSources = () => apiGet<ListResponse<SourceSetting>>("/sources");

/**
 * Provisional: aún no está en el contrato #21. Del más nuevo al más viejo. Sin `domain`, los de toda la empresa.
 * `limit` va de 1 a 100 (la API da 50 sin él) y `total` cuenta todos los del filtro, no solo la página (RC-318).
 */
export const getScans = ({ domain, limit, offset }: { domain?: string; limit?: number; offset?: number } = {}) => {
  const query = new URLSearchParams();
  if (domain !== undefined) query.set("domain", domain);
  if (limit !== undefined) query.set("limit", String(limit));
  if (offset !== undefined) query.set("offset", String(offset));
  const qs = query.toString();
  return apiGet<ListResponse<Scan>>(qs ? `/scans?${qs}` : "/scans");
};
