import type { Band } from "@/types";

const LOCALE = "es-MX";
// Zona fija: el servidor y el navegador deben mostrar la misma hora (si no, hay errores de hidratación).
const TIME_ZONE = "America/Monterrey";

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" });
const dateFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: "2-digit", month: "short", year: "numeric" });
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** Día, mes, año, hora de 24 h y zona ("30 sep 2026, 14:20 GMT-6"). */
export function formatDateTime(iso: string): string {
  const parts = dateTimeFormat.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month").replace(".", "")} ${get("year")}, ${get("hour")}:${get("minute")} ${get("timeZoneName")}`;
}

export function formatRelative(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, "hour");
  return relativeFormat.format(Math.round(hours / 24), "day");
}

/** Número con su sustantivo en singular o plural: cantidad(1, "dominio") da "1 dominio" y
 * cantidad(3, "acción", "acciones") da "3 acciones". */
export function cantidad(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
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

/** Banda del score de riesgo (0–100) según el criterio #29. Su nombre está en BAND_LABELS. */
export function scoreBand(score: number): Band {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Fecha sin hora, para vigencias y periodos ("2026-12-31" → "31 dic 2026"). */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate.length === 10 ? `${isoDate}T12:00:00Z` : isoDate)).replace(/\./g, "").replace(/ de /g, " ");
}

const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: "numeric", month: "short" });

/** Día y mes, para ejes y listas ("2026-09-30T…" → "30 sep"). */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)).replace(".", "");
}
