// Atribución de las fuentes con licencia que pide nombrarlas donde se muestran sus datos (RC-54). HIBP publica sus datos
// bajo CC BY 4.0: el portal dice «Fuente: Have I Been Pwned» con enlace en cada hallazgo suyo, como el CSV (columna
// atribucion de BackKL) y el reporte (attributions). Los enlaces son fijos: no se toman de la evidencia.
import type { FindingSource } from "@/types";

export interface Atribucion {
  text: string;
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
}

export const ATRIBUCIONES: Partial<Record<FindingSource, Atribucion>> = {
  hibp: {
    text: "Fuente: Have I Been Pwned",
    name: "Have I Been Pwned",
    url: "https://haveibeenpwned.com",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
};

/** La atribución de la fuente de un hallazgo, o null si su fuente no la pide. */
export function atribucionDe(source: string): Atribucion | null {
  return Object.hasOwn(ATRIBUCIONES, source) ? ATRIBUCIONES[source as FindingSource] ?? null : null;
}

/**
 * Códigos de regla cuyos hallazgos vienen de una fuente con atribución, para las pantallas que no traen la fuente
 * (la comparación de scores). Los de HIBP son los de cirdan/recolectores/hibp.py de BackKL.
 */
const FUENTE_DE_REGLA: Record<string, FindingSource> = {
  breach_exposure: "hibp",
  breach_exposure_old: "hibp",
  breach_exposure_no_passwords: "hibp",
};

/** La atribución de un hallazgo por su código de regla, o null si su fuente no la pide. */
export function atribucionDeRegla(ruleCode: string): Atribucion | null {
  return Object.hasOwn(FUENTE_DE_REGLA, ruleCode) ? atribucionDe(FUENTE_DE_REGLA[ruleCode]) : null;
}

/** Las atribuciones de una lista de hallazgos, una por fuente y en el orden en que aparecen. */
export function atribucionesDe(findings: { source: string }[]): Atribucion[] {
  const vistas = new Map<string, Atribucion>();
  for (const f of findings) {
    const a = atribucionDe(f.source);
    if (a && !vistas.has(f.source)) vistas.set(f.source, a);
  }
  return [...vistas.values()];
}
