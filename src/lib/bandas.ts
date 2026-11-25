// Bandas de riesgo por cliente (RC-237). Las bandas, las letras y el piso de cada score los manda la API con los cortes
// del juego con que se calculó. El portal no tiene cortes fijos: busca un score en los rangos que mandó la API y, solo
// para la vista previa del editor de pesos, arma los rangos de unos cortes que todavía no se guardan, con la misma regla
// que cirdan/score/criterio.py.
import type { Band, BandCutoffs, BandRange, Grade, ScoringWeightsUpdateResult } from "@/types";

/** Valores enteros mínimos de cada banda, como el CHECK de la migración 022 de BackKL. */
export const ANCHO_MINIMO_BANDA = 10;

/** Banda de un score en los rangos de la API (`GET /scoring/weights`). `null` si no cae en ninguno. */
export function bandaEnRangos(score: number, bands: readonly BandRange[]): Band | null {
  return bands.find((b) => b.from <= score && score <= b.to)?.band ?? null;
}

/** Error de unos cortes en español, o `null` si la API los acepta: enteros en orden, medio desde 10, al menos 10
 * valores por banda y crítico a más tardar en 91. */
export function errorDeCortes(c: BandCutoffs): string | null {
  const valores = [c.medium, c.high, c.critical];
  if (valores.some((v) => !Number.isInteger(v))) return "Cada corte debe ser un número entero.";
  if (c.medium < ANCHO_MINIMO_BANDA) return `El medio empieza en ${ANCHO_MINIMO_BANDA} o más, para que el bajo tenga al menos ${ANCHO_MINIMO_BANDA} puntos.`;
  if (c.high - c.medium < ANCHO_MINIMO_BANDA) return `El alto empieza por lo menos ${ANCHO_MINIMO_BANDA} puntos arriba del medio.`;
  if (c.critical - c.high < ANCHO_MINIMO_BANDA) return `El crítico empieza por lo menos ${ANCHO_MINIMO_BANDA} puntos arriba del alto.`;
  if (c.critical > 101 - ANCHO_MINIMO_BANDA) return `El crítico empieza a más tardar en ${101 - ANCHO_MINIMO_BANDA}, para que tenga al menos ${ANCHO_MINIMO_BANDA} puntos.`;
  return null;
}

export interface VistaPrevia {
  bands: BandRange[];
  grades: { grade: Grade; from: number; to: number }[];
  floor: { one_critical: number; two_or_more_critical: number };
}

/** Rangos de bandas y letras y el piso que tendrán unos cortes válidos, antes de guardarlos. */
export function vistaPrevia(c: BandCutoffs): VistaPrevia {
  const mitad = Math.floor(c.medium / 2);
  return {
    bands: [
      { band: "low", from: 0, to: c.medium - 1 },
      { band: "medium", from: c.medium, to: c.high - 1 },
      { band: "high", from: c.high, to: c.critical - 1 },
      { band: "critical", from: c.critical, to: 100 },
    ],
    grades: [
      { grade: "A", from: 0, to: mitad - 1 },
      { grade: "B", from: mitad, to: c.medium - 1 },
      { grade: "C", from: c.medium, to: c.high - 1 },
      { grade: "D", from: c.high, to: c.critical - 1 },
      { grade: "F", from: c.critical, to: 100 },
    ],
    floor: { one_critical: c.high, two_or_more_critical: c.critical },
  };
}

/** Si dos juegos de cortes son iguales. */
export function mismosCortes(a: BandCutoffs, b: BandCutoffs): boolean {
  return a.medium === b.medium && a.high === b.high && a.critical === b.critical;
}

const dominios = (n: number) => `${n} ${n === 1 ? "dominio" : "dominios"}`;

/**
 * Lo que dice el editor después del PUT de pesos. Un PUT con los mismos pesos y cortes no crea versión, pero puede
 * poner al día los dominios cuyo último score salió con otra versión, así que `unchanged: false` no siempre quiere decir
 * versión nueva (RC-310).
 */
export function mensajeDePesos(r: ScoringWeightsUpdateResult, versionAnterior: number): string {
  const saltados = r.skipped_domains
    ? ` ${r.skipped_domains === 1 ? "Quedó" : "Quedaron"} sin recalcular ${dominios(r.skipped_domains)} con score de ML sin severidades guardadas, hasta su próximo escaneo.`
    : "";
  if (r.unchanged) return `Los pesos y los cortes no cambiaron; sigue activa la versión ${r.rule_set_version}.${saltados}`;
  if (r.rule_set_version === versionAnterior) {
    const venia = r.recalculated_domains === 1 ? "venía" : "venían";
    return `Los pesos y los cortes no cambiaron; sigue activa la versión ${r.rule_set_version} y se puso al día el score de ${dominios(r.recalculated_domains)} que ${venia} de otra versión.${saltados}`;
  }
  const nuevos = `${r.band_cutoffs.medium}, ${r.band_cutoffs.high} y ${r.band_cutoffs.critical}`;
  return `Se activó la versión ${r.rule_set_version}, con los cortes ${nuevos}, y se recalculó el score de ${dominios(r.recalculated_domains)}.`;
}
