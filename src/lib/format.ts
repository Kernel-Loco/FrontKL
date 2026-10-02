const LOCALE = "es-MX";

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function formatRelative(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, "hour");
  return relativeFormat.format(Math.round(hours / 24), "day");
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

/** Nivel cualitativo del score de riesgo (0–100). */
export function riskLevel(score: number): string {
  if (score >= 80) return "Crítico";
  if (score >= 60) return "Alto";
  if (score >= 40) return "Medio";
  return "Bajo";
}
