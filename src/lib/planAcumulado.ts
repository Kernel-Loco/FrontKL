import { tx } from "@/i18n/tx";
// Plan de acción por regla o por activo y en orden acumulado (RC-263). Sin imports, para que node --test lo cargue
// sin alias. Por regla la API deja el orden de siempre (lo que baja cada una sola) y por activo ordena de forma voraz
// (primero la que más baja el score después de las de arriba). En las dos, cada acción trae dos impactos: el de
// resolverla sola (score_reduction) y el de resolverla después de todas las de arriba (score_reduction_acumulado). Los
// sueltos no se suman, porque los topes por categoría y el piso de un crítico hacen que varias acciones recuperen los
// mismos puntos.

export type Agrupar = "regla" | "activo";

type Param = string | string[] | undefined;

/** La agrupación de la URL (?agrupar=activo). Cualquier otro valor es por regla, lo de siempre. */
export function leerAgrupar(valor: Param): Agrupar {
  return valor === "activo" ? "activo" : "regla";
}

/** La URL del plan con su dominio y su agrupación. Por regla no se escribe. */
export function urlPlan(dominio: string, agrupar: Agrupar): string {
  const query = new URLSearchParams({ dominio });
  if (agrupar === "activo") query.set("agrupar", "activo");
  return `/dashboard/plan?${query}`;
}

/** Cómo se lee una reducción: "−7" o "sin cambio". */
export function reduccion(puntos: number): string {
  return puntos > 0 ? `−${puntos}` : tx("sin cambio");
}
