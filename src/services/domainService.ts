// Dominios, hallazgos, score, histórico, explicación y activos (contrato de API v1, #21).
// Hoy devuelve los datos mock de src/mocks/api; cada función indica con un TODO el
// endpoint de FastAPI que la reemplazará (vía `apiClient`). Las pantallas solo llaman
// a estas funciones, así que conectar la API no les cambia nada.
import { mockDelay } from "@/lib/mock";
import { mockDomains, mockExplanation, mockFindings, mockScore, mockScoreHistory } from "@/mocks/api/contrato";
import { mockAssets, mockExplanationsExtra, mockTxtVerifications } from "@/mocks/api/provisional";
import type {
  Asset,
  Domain,
  DomainFindings,
  DomainRegistrationRequest,
  DomainScore,
  FindingExplanation,
  ListResponse,
  ScoreHistory,
  TxtVerification,
} from "@/types";
import { ServiceError } from "./errors";

/** Dominio que tiene datos completos en los mocks (el de la demo). */
export const DEMO_DOMAIN = "acme-demo.mx";

function notFound(message: string): never {
  throw new ServiceError("not_found", message);
}

function knownDomain(fqdn: string) {
  if (!mockDomains.items.some((d) => d.fqdn === fqdn)) notFound("Dominio no encontrado para esta organización");
}

export async function getDomains(): Promise<ListResponse<Domain>> {
  // TODO: conectar con backend → GET /domains
  await mockDelay(300);
  return structuredClone(mockDomains);
}

export async function getDomainFindings(fqdn: string): Promise<DomainFindings> {
  // TODO: conectar con backend → GET /domains/{fqdn}/findings
  await mockDelay(300);
  knownDomain(fqdn);
  return fqdn === DEMO_DOMAIN ? structuredClone(mockFindings) : { domain: fqdn, items: [], total: 0 };
}

export async function getDomainScore(fqdn: string): Promise<DomainScore> {
  // TODO: conectar con backend → GET /domains/{fqdn}/score
  await mockDelay(300);
  knownDomain(fqdn);
  if (fqdn !== DEMO_DOMAIN) notFound("El dominio aún no tiene score");
  return structuredClone(mockScore);
}

export async function getScoreHistory(fqdn: string): Promise<ScoreHistory> {
  // TODO: conectar con backend → GET /domains/{fqdn}/score/history
  await mockDelay(300);
  knownDomain(fqdn);
  return fqdn === DEMO_DOMAIN ? structuredClone(mockScoreHistory) : { domain: fqdn, items: [], total: 0 };
}

export async function getFindingExplanation(findingId: string): Promise<FindingExplanation> {
  // TODO: conectar con backend → GET /findings/{id}/explanation
  await mockDelay(250);
  if (findingId === mockExplanation.finding_id) return structuredClone(mockExplanation);
  const finding = mockFindings.items.find((f) => f.id === findingId);
  const extra = mockExplanationsExtra[findingId];
  if (!finding || !extra) notFound("No encontramos la explicación de este hallazgo.");
  const { title, severity, base_severity, category, rule_code, caracteristicas } = finding;
  return { ...structuredClone(extra), title, severity, base_severity, category, rule_code, caracteristicas: { ...caracteristicas } };
}

export async function getDomainAssets(fqdn: string): Promise<ListResponse<Asset>> {
  // TODO: conectar con backend → GET /domains/{fqdn}/assets (provisional, aún no está en el contrato #21)
  await mockDelay(300);
  knownDomain(fqdn);
  return fqdn === DEMO_DOMAIN ? structuredClone(mockAssets) : { items: [], total: 0 };
}

const FQDN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Da de alta un dominio (solo Admin). Queda pendiente hasta que publique su registro TXT.
 * La carta firmada se sube junto con los datos.
 */
export async function registerDomain(
  request: DomainRegistrationRequest,
  letter: File,
): Promise<{ domain: Domain; txt: TxtVerification }> {
  // TODO: conectar con backend → POST /domains (multipart: datos + carta en PDF)
  await mockDelay(700);
  const fqdn = request.fqdn.trim().toLowerCase().replace(/\.$/, "");
  if (!FQDN.test(fqdn)) throw new ServiceError("invalid", "Escribe un dominio válido, como ejemplo.com.");
  if (mockDomains.items.some((d) => d.fqdn === fqdn)) throw new ServiceError("duplicate", "Ese dominio ya está registrado.");
  if (letter.type !== "application/pdf") throw new ServiceError("invalid", "La carta de autorización debe ser un PDF.");
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const domain: Domain = {
    id: crypto.randomUUID(),
    fqdn,
    status: "pending_verification",
    authorization: { status: "valid", valid_from: request.valid_from, valid_until: request.valid_until, signer_email: request.signer_email },
    txt: { status: "missing", checked_at: null },
    scan_eligibility: { can_scan: false, reasons: ["txt_not_verified"] },
    score: null,
    band: null,
    open_findings: { critical: 0, high: 0, medium: 0, low: 0 },
    last_scan_at: null,
    next_scan_at: null,
  };
  return { domain, txt: { fqdn, status: "missing", expected_value: `cirdan-verification=${token}`, checked_at: null } };
}

export async function getTxtVerifications(): Promise<ListResponse<TxtVerification>> {
  // TODO: conectar con backend → GET /domains/txt (solo Admin)
  await mockDelay(250);
  return structuredClone(mockTxtVerifications);
}

/** Vuelve a consultar el registro TXT de un dominio (solo Admin). */
export async function verifyTxt(fqdn: string): Promise<TxtVerification> {
  // TODO: conectar con backend → POST /domains/{fqdn}/txt/verify
  await mockDelay(800);
  const current = mockTxtVerifications.items.find((v) => v.fqdn === fqdn);
  if (!current) throw new ServiceError("not_found", "Dominio no encontrado para esta organización");
  // En los datos demo, partner-example.com todavía no publica su registro.
  return { ...current, checked_at: new Date().toISOString() };
}
