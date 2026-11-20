// Filtros de la pantalla 'Activos' (RC-231): de los parámetros de la URL a la consulta de GET /api/v1/assets.
// Sin imports, para que node --test lo cargue sin alias. Un valor que la API rechazaría con 422 se descarta aquí:
// un tipo que no existe, un dominio que no es de la empresa, un texto vacío o de más de 200 caracteres y una página
// fuera de rango vuelven a su valor por omisión, así la pantalla nunca cae por un enlace editado a mano.

export const TIPOS_ACTIVO = ["domain", "subdomain", "certificate", "ip", "service", "api_doc", "email"] as const;
export type TipoActivoFiltro = (typeof TIPOS_ACTIVO)[number];

/** Activos por página. La API acepta hasta 200. */
export const POR_PAGINA = 50;
/** Tope de offset de la API (le=1_000_000). */
const MAX_OFFSET = 1_000_000;
const MAX_TEXTO = 200;

export interface FiltrosActivos {
  dominio: string;
  tipo: TipoActivoFiltro | "";
  texto: string;
  pagina: number;
}

type Param = string | string[] | undefined;

const uno = (valor: Param) => (typeof valor === "string" ? valor : "");

/** Los filtros válidos de la URL. `dominios` son los fqdn de la empresa. */
export function leerFiltros(
  params: { dominio?: Param; tipo?: Param; q?: Param; pagina?: Param },
  dominios: readonly string[],
): FiltrosActivos {
  const dominio = uno(params.dominio);
  const tipo = uno(params.tipo);
  const texto = uno(params.q).trim();
  const pagina = Number(uno(params.pagina));
  const maxPagina = Math.floor(MAX_OFFSET / POR_PAGINA) + 1;
  return {
    dominio: dominios.includes(dominio) ? dominio : "",
    tipo: (TIPOS_ACTIVO as readonly string[]).includes(tipo) ? (tipo as TipoActivoFiltro) : "",
    texto: texto.length <= MAX_TEXTO ? texto : "",
    pagina: Number.isInteger(pagina) && pagina >= 1 && pagina <= maxPagina ? pagina : 1,
  };
}

/** Parámetros de la API para esos filtros, sin `formato`. Con `paginar` agrega limit y offset. */
export function consultaActivos(filtros: FiltrosActivos, paginar = true): string {
  const query = new URLSearchParams();
  if (filtros.dominio) query.set("domain", filtros.dominio);
  if (filtros.tipo) query.set("type", filtros.tipo);
  if (filtros.texto) query.set("q", filtros.texto);
  if (paginar) {
    query.set("limit", String(POR_PAGINA));
    query.set("offset", String((filtros.pagina - 1) * POR_PAGINA));
  }
  return query.toString();
}

/** Parámetros de la URL de la pantalla para esos filtros. La página 1 no se escribe. */
export function urlFiltros(filtros: FiltrosActivos): string {
  const query = new URLSearchParams();
  if (filtros.dominio) query.set("dominio", filtros.dominio);
  if (filtros.tipo) query.set("tipo", filtros.tipo);
  if (filtros.texto) query.set("q", filtros.texto);
  if (filtros.pagina > 1) query.set("pagina", String(filtros.pagina));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** Número de páginas para un total (al menos 1). */
export function paginas(total: number): number {
  return Math.max(1, Math.ceil(total / POR_PAGINA));
}
