// Lecturas del portal contra la API v1 de FastAPI (RC-17). Solo desde el servidor (páginas y
// layouts): la cookie de sesión viaja sola y RLS deja ver solo los datos de tu empresa.
// Las acciones de los botones (escanear, registrar, explicación) están en domainService.ts y
// scanService.ts, que corren en el navegador.
import { apiGet } from "@/lib/apiServer";
import type {
  Asset,
  ActionPlan,
  Domain,
  DomainFindings,
  DomainScore,
  ListResponse,
  Scan,
  ScoreHistory,
  ScoringWeights,
  TxtVerification,
} from "@/types";

const path = (fqdn: string) => encodeURIComponent(fqdn);

export const getDomains = () => apiGet<ListResponse<Domain>>("/domains");

export const getDomainFindings = (fqdn: string) => apiGet<DomainFindings>(`/domains/${path(fqdn)}/findings`);

export const getDomainScore = (fqdn: string) => apiGet<DomainScore>(`/domains/${path(fqdn)}/score`);

export const getScoreHistory = (fqdn: string) => apiGet<ScoreHistory>(`/domains/${path(fqdn)}/score/history`);

export const getActionPlan = (fqdn: string) => apiGet<ActionPlan>(`/domains/${path(fqdn)}/action-plan`);

/** Provisional: aún no está en el contrato #21. */
export const getDomainAssets = (fqdn: string) => apiGet<ListResponse<Asset>>(`/domains/${path(fqdn)}/assets`);

/** Solo Admin. */
export const getTxtVerifications = () => apiGet<ListResponse<TxtVerification>>("/domains/txt");

export const getScoringWeights = () => apiGet<ScoringWeights>("/scoring/weights");

/** Provisional: aún no está en el contrato #21. */
export const getScans = () => apiGet<ListResponse<Scan>>("/scans");
