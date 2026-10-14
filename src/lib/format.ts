import type { Band } from "@/types";

const LOCALE = "es-MX";

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", year: "numeric" });
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** Día, mes y hora de 24 h ("30 sep, 14:20"). */
export function formatDateTime(iso: string): string {
  const parts = dateTimeFormat.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month").replace(".", "")}, ${get("hour")}:${get("minute")}`;
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

/** Banda del score de riesgo (0–100) según el criterio #29. Su nombre está en BAND_LABELS. */
export function scoreBand(score: number): Band {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Fecha sin hora, para vigencias y periodos ("2026-12-31" → "31 dic 2026"). */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate)).replace(/\./g, "").replace(/ de /g, " ");
}

const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });

/** Día y mes, para ejes y listas ("2026-09-30T…" → "30 sep"). */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)).replace(".", "");
}
