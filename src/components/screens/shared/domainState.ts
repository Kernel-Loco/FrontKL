// Estado de un dominio para mostrarlo en tablas: autorizado, por validar, vencido, etc.
import type { Domain } from "@/types";
import type { Tone } from "@/components/ui/tones";

export interface DomainState {
  label: string;
  tone: Tone;
}

export function domainState(domain: Domain): DomainState {
  if (domain.status === "removed") return { label: "Eliminado", tone: "gray" };
  if (domain.authorization.status === "revoked") return { label: "Revocada", tone: "red" };
  if (domain.authorization.status === "expired") return { label: "Vencido", tone: "red" };
  if (domain.status === "paused") return { label: "En pausa", tone: "gray" };
  if (domain.authorization.status === "missing") return { label: "Sin autorización", tone: "amber" };
  if (domain.txt.status !== "verified" || domain.status === "pending_verification") return { label: "Pendiente TXT", tone: "amber" };
  return { label: "Autorizado", tone: "teal" };
}

/** Dominios con score, de mayor a menor riesgo. */
export function scoredDomains(domains: Domain[]): Domain[] {
  return domains.filter((d) => d.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
