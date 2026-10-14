// Colores para severidades, bandas del score y estados.
import type { Band, Severity } from "@/types";

export type Tone = "red" | "orange" | "amber" | "blue" | "teal" | "green" | "indigo" | "gray";

/** Etiqueta: fondo tenue y texto del color. */
export const BADGE_TONES: Record<Tone, string> = {
  red: "bg-lt-red/12 text-lt-red ring-lt-red/25",
  orange: "bg-lt-orange/12 text-lt-orange ring-lt-orange/25",
  amber: "bg-lt-amber/12 text-lt-amber ring-lt-amber/25",
  blue: "bg-lt-blue/12 text-lt-blue ring-lt-blue/25",
  teal: "bg-lt-teal/12 text-lt-teal ring-lt-teal/25",
  green: "bg-lt-green/12 text-lt-green ring-lt-green/25",
  indigo: "bg-lt-indigo/15 text-lt-indigo-soft ring-lt-indigo/30",
  gray: "bg-lt-raised text-lt-muted ring-lt-border",
};

/** Color sólido (barras, puntos, números). */
export const SOLID_TONES: Record<Tone, { bg: string; text: string; stroke: string }> = {
  red: { bg: "bg-lt-red", text: "text-lt-red", stroke: "stroke-lt-red" },
  orange: { bg: "bg-lt-orange", text: "text-lt-orange", stroke: "stroke-lt-orange" },
  amber: { bg: "bg-lt-amber", text: "text-lt-amber", stroke: "stroke-lt-amber" },
  blue: { bg: "bg-lt-blue", text: "text-lt-blue", stroke: "stroke-lt-blue" },
  teal: { bg: "bg-lt-teal", text: "text-lt-teal", stroke: "stroke-lt-teal" },
  green: { bg: "bg-lt-green", text: "text-lt-green", stroke: "stroke-lt-green" },
  indigo: { bg: "bg-lt-indigo", text: "text-lt-indigo-soft", stroke: "stroke-lt-indigo" },
  gray: { bg: "bg-lt-faint", text: "text-lt-muted", stroke: "stroke-lt-faint" },
};

export const SEVERITY_TONE: Record<Severity, Tone> = { critical: "red", high: "orange", medium: "amber", low: "blue" };
export const BAND_TONE: Record<Band, Tone> = { critical: "red", high: "orange", medium: "amber", low: "blue" };
