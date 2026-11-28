import { tx } from "@/i18n/tx";
// Vista en árbol de la pantalla 'Activos' (RC-248): de la lista de GET /api/v1/assets al árbol dominio, subdominio,
// IP y servicio. Sin imports, para que node --test lo cargue sin alias. La API no manda el id del padre sino su valor
// y su tipo (parent y parent_type), y la base no repite (domain_id, asset_type, value), así que dominio, tipo y valor
// bastan para encontrar al padre dentro de la lista. Lo que no se puede colgar de su padre sale como activo suelto
// debajo de su dominio, con el motivo: un ciclo, un padre de otro dominio o un padre que no vino en la lista (por los
// filtros o por el tope). El árbol nunca se rompe ni repite un activo.

/** Activos por petición al armar el árbol. La API acepta hasta 200. */
export const POR_PETICION_ARBOL = 200;
/** Tope de activos del árbol: 10 peticiones. Con más, el aviso pide filtrar por dominio o tipo. */
export const MAX_ARBOL = 2000;
/** Hasta este número de activos el árbol abre con los dominios abiertos. Con más abre todo cerrado. */
export const ABRE_ABIERTO_HASTA = 40;

/**
 * El mismo orden de tipos que la API (ORDEN_TIPO de cirdan/api/v1.py). Dentro de un tipo los hijos van en el orden en
 * que llegaron: la API ordena por dominio, tipo, valor e id con la collation de la base (en_US.utf8, que en el primer
 * nivel no cuenta la puntuación: apib, api, api-v2 y b.mx antes que b-uno.mx), que un '<' de JavaScript no repite.
 */
const ORDEN_TIPO = ["domain", "subdomain", "certificate", "ip", "service", "api_doc", "email", "profile"];

export type Vista = "lista" | "arbol";
export type MotivoSuelto = "ciclo" | "otro_dominio" | "padre_fuera";

/** Lo que el árbol necesita de cada activo de GET /api/v1/assets. */
export interface ActivoArbol {
  id: string;
  domain: string;
  type: string;
  value: string;
  parent: string | null;
  parent_type: string | null;
}

/** Solo los campos que usa el árbol: la página no manda al navegador los atributos y las fechas de 2000 activos. */
export function soloArbol(a: ActivoArbol): ActivoArbol {
  return { id: a.id, domain: a.domain, type: a.type, value: a.value, parent: a.parent, parent_type: a.parent_type };
}

/** Lo que la página arma para el árbol: los activos y si la lista llegó completa. */
export interface DatosArbol {
  activos: ActivoArbol[];
  /** El total de la primera petición: con más de MAX_ARBOL el árbol muestra solo los primeros. */
  total: number;
  /** La lista cambió entre una petición y otra aunque se pidió dos veces: puede faltar o sobrar un activo. */
  cambio: boolean;
  /** Peticiones que fallaron, de `partes`: el árbol sale con lo que sí llegó. */
  fallidas: number;
  partes: number;
}

export interface NodoActivo<T extends ActivoArbol> {
  activo: T;
  hijos: NodoActivo<T>[];
  /** Todos los activos debajo de este, a cualquier profundidad. */
  descendientes: number;
  /** Solo en un activo suelto: por qué no cuelga de su padre. */
  suelto?: MotivoSuelto;
}

export interface RamaDominio<T extends ActivoArbol> {
  dominio: string;
  /** El activo de tipo 'domain' del propio fqdn, si vino en la lista. */
  activo: T | null;
  hijos: NodoActivo<T>[];
  descendientes: number;
}

type Param = string | string[] | undefined;

/** La vista de la URL (?vista=arbol). Cualquier otro valor es la lista. */
export function leerVista(valor: Param): Vista {
  return valor === "arbol" ? "arbol" : "lista";
}

/**
 * Agrega la vista a los parámetros de la URL de la pantalla (los de urlFiltros, con o sin '?'). La lista no se escribe.
 */
export function conVista(qs: string, vista: Vista): string {
  const query = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  query.delete("vista");
  if (vista === "arbol") query.set("vista", "arbol");
  const salida = query.toString();
  return salida ? `?${salida}` : "";
}

/**
 * Las consultas a GET /api/v1/assets para traer hasta MAX_ARBOL activos. `base` es consultaActivos(filtros, false), sin
 * limit ni offset. `total` es el de la primera respuesta: la primera consulta (offset 0) siempre va.
 */
export function consultasArbol(base: string, total = POR_PETICION_ARBOL): string[] {
  const hasta = Math.min(Math.max(total, 1), MAX_ARBOL);
  const consultas: string[] = [];
  for (let offset = 0; offset < hasta; offset += POR_PETICION_ARBOL) {
    const query = new URLSearchParams(base);
    query.set("limit", String(POR_PETICION_ARBOL));
    query.set("offset", String(offset));
    consultas.push(query.toString());
  }
  return consultas;
}

/**
 * Si las páginas del árbol cuadran: todas con el total de la primera y, sin repetidos, tantos activos como pedían (el
 * total hasta MAX_ARBOL). Si un escaneo agrega o quita un activo entre una petición y otra, la API corre el offset y
 * una página repite un activo o se salta otro, y esto da false.
 */
export function paginasCuadran(totales: readonly number[], ids: readonly string[]): boolean {
  const esperado = Math.min(totales[0] ?? 0, MAX_ARBOL);
  return totales.every((t) => t === totales[0]) && ids.length === esperado && new Set(ids).size === esperado;
}

/** Una página de GET /api/v1/assets, con lo que usa traerArbol. */
export interface PaginaActivos<T extends ActivoArbol> {
  items: T[];
  total: number;
}

/** Lo que traerArbol junta: la primera página, los activos sin ids repetidos y si la lista llegó completa. */
export interface TraidoArbol<T extends ActivoArbol, P extends PaginaActivos<T>> {
  primera: P;
  activos: T[];
  cambio: boolean;
  fallidas: number;
  partes: number;
}

/** Los activos en el orden en que llegaron, cada id una vez (dos páginas que se enciman repiten uno). */
export function unicosPorId<T extends ActivoArbol>(activos: readonly T[]): T[] {
  const vistos = new Set<string>();
  return activos.filter((a) => !vistos.has(a.id) && vistos.add(a.id));
}

/**
 * Trae los activos del árbol hasta MAX_ARBOL, en peticiones de POR_PETICION_ARBOL. La primera da el total y las demás
 * van juntas. Si entre una y otra cambió la lista (un escaneo que agrega o quita activos), se pide todo otra vez una
 * sola vez y, si sigue sin cuadrar, sale con cambio. Si falla una petición que no es la primera, sale con lo que sí
 * llegó y cuenta las fallidas. Si en el segundo intento falla la primera, sale con lo del primero y cambio. Un error
 * que no es de la API (el redirect de Next a /auth/expirada cuando la sesión vence) lo vuelve a lanzar `relanzar`, así
 * la pantalla va al login en vez de salir a medias.
 */
export async function traerArbol<T extends ActivoArbol, P extends PaginaActivos<T>>(
  base: string,
  pedir: (consulta: string) => Promise<P>,
  relanzar: (error: unknown) => void,
): Promise<TraidoArbol<T, P>> {
  let anterior: TraidoArbol<T, P> | undefined;
  for (let intento = 1; ; intento++) {
    let primera: P;
    try {
      primera = await pedir(consultasArbol(base)[0]);
    } catch (error) {
      relanzar(error);
      if (!anterior) throw error;
      return anterior;
    }
    const resto = await Promise.allSettled(consultasArbol(base, primera.total).slice(1).map((q) => pedir(q)));
    for (const r of resto) if (r.status === "rejected") relanzar(r.reason);
    const llegaron = [primera, ...resto.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))];
    const fallidas = resto.length + 1 - llegaron.length;
    const items = llegaron.flatMap((r) => r.items);
    const cambio = fallidas === 0 && !paginasCuadran(llegaron.map((r) => r.total), items.map((a) => a.id));
    const traido = { primera, activos: unicosPorId(items), cambio, fallidas, partes: resto.length + 1 };
    if (cambio && intento === 1) {
      anterior = traido;
      continue;
    }
    return traido;
  }
}

/** Si el árbol abre con los dominios abiertos. Con muchos activos abre todo cerrado. */
export function abreAbierto(activos: number): boolean {
  return activos <= ABRE_ABIERTO_HASTA;
}

const clave = (...partes: string[]) => partes.join("\u0000");
const posicion = (tipo: string) => {
  const i = ORDEN_TIPO.indexOf(tipo);
  return i === -1 ? ORDEN_TIPO.length : i;
};

/**
 * Arma el árbol. Cada dominio es una raíz con sus activos debajo. Un activo sin padre, o cuyo padre es el activo del
 * propio dominio, cuelga del dominio. Un ciclo (A hijo de B y B hijo de A, o un activo padre de sí mismo), un padre que
 * solo existe en otro dominio o un padre que no vino en la lista dejan al activo suelto debajo de su dominio. Los hijos
 * van por tipo, como la API, y dentro de un tipo en el orden en que llegaron. Los dominios, en el orden en que llegó
 * su primer activo. Un id repetido (dos páginas que se enciman) se toma una vez.
 */
export function armarArbol<T extends ActivoArbol>(activos: readonly T[]): RamaDominio<T>[] {
  const unicos = unicosPorId(activos);
  const llegada = new Map(unicos.map((a, i) => [a.id, i]));
  const comparar = (a: T, b: T) => posicion(a.type) - posicion(b.type) || (llegada.get(a.id) ?? 0) - (llegada.get(b.id) ?? 0);

  const porClave = new Map<string, T>();
  const porValor = new Map<string, T>();
  const otrosDominios = new Map<string, Set<string>>();
  for (const a of unicos) {
    if (!porClave.has(clave(a.domain, a.type, a.value))) porClave.set(clave(a.domain, a.type, a.value), a);
    if (!porValor.has(clave(a.domain, a.value))) porValor.set(clave(a.domain, a.value), a);
    const enDominios = otrosDominios.get(clave(a.type, a.value)) ?? new Set<string>();
    enDominios.add(a.domain);
    otrosDominios.set(clave(a.type, a.value), enDominios);
  }

  const raiz = new Map<string, T>();
  for (const a of unicos) {
    if (a.type === "domain" && a.value.toLowerCase() === a.domain.toLowerCase() && !raiz.has(a.domain)) raiz.set(a.domain, a);
  }

  // El padre de cada activo dentro de la lista, o null si cuelga del dominio.
  const padre = new Map<string, T | null>();
  const suelto = new Map<string, MotivoSuelto>();
  for (const a of unicos) {
    const delDominio = (a.parent_type === "domain" || a.parent_type === null) &&
      a.parent?.toLowerCase() === a.domain.toLowerCase();
    if (raiz.get(a.domain) === a || a.parent === null || a.parent === "" || delDominio) {
      padre.set(a.id, null);
      continue;
    }
    const encontrado = a.parent_type
      ? porClave.get(clave(a.domain, a.parent_type, a.parent))
      : porValor.get(clave(a.domain, a.parent));
    if (encontrado) {
      padre.set(a.id, raiz.get(a.domain) === encontrado ? null : encontrado);
      continue;
    }
    padre.set(a.id, null);
    const fuera = a.parent_type
      ? [...(otrosDominios.get(clave(a.parent_type, a.parent)) ?? [])].some((d) => d !== a.domain)
      : unicos.some((b) => b.domain !== a.domain && b.value === a.parent);
    suelto.set(a.id, fuera ? "otro_dominio" : "padre_fuera");
  }

  // Ciclos: se sube por los padres y, si el camino vuelve a un activo del mismo camino, todo el ciclo queda suelto.
  const listo = new Set<string>();
  for (const a of unicos) {
    const camino: T[] = [];
    const enCamino = new Set<string>();
    let actual: T | null | undefined = a;
    while (actual && !listo.has(actual.id)) {
      if (enCamino.has(actual.id)) {
        for (const c of camino.slice(camino.indexOf(actual))) {
          padre.set(c.id, null);
          suelto.set(c.id, "ciclo");
        }
        break;
      }
      camino.push(actual);
      enCamino.add(actual.id);
      actual = padre.get(actual.id);
    }
    for (const c of camino) listo.add(c.id);
  }

  const nodos = new Map<string, NodoActivo<T>>();
  for (const a of unicos) {
    if (raiz.get(a.domain) === a) continue;
    const nodo: NodoActivo<T> = { activo: a, hijos: [], descendientes: 0 };
    const motivo = suelto.get(a.id);
    if (motivo) nodo.suelto = motivo;
    nodos.set(a.id, nodo);
  }

  const ramas = new Map<string, RamaDominio<T>>();
  const rama = (dominio: string) => {
    let r = ramas.get(dominio);
    if (!r) {
      r = { dominio, activo: raiz.get(dominio) ?? null, hijos: [], descendientes: 0 };
      ramas.set(dominio, r);
    }
    return r;
  };
  for (const a of unicos) {
    const nodo = nodos.get(a.id);
    if (!nodo) {
      rama(a.domain);
      continue;
    }
    const p = padre.get(a.id);
    const arriba = p ? nodos.get(p.id) : undefined;
    if (arriba) arriba.hijos.push(nodo);
    else rama(a.domain).hijos.push(nodo);
  }

  const ordenar = (lista: NodoActivo<T>[]): number => {
    lista.sort((x, y) => comparar(x.activo, y.activo));
    let total = 0;
    for (const n of lista) {
      n.descendientes = ordenar(n.hijos);
      total += 1 + n.descendientes;
    }
    return total;
  };
  const salida = [...ramas.values()];   // en el orden en que llegó el primer activo de cada dominio
  for (const r of salida) r.descendientes = ordenar(r.hijos);
  return salida;
}

/** Texto del motivo de un activo suelto, con el padre que trae la API. */
export function textoSuelto(motivo: MotivoSuelto, padre: string | null): string {
  if (motivo === "ciclo") return tx("Suelto: su padre termina apuntando a él mismo (ciclo).");
  const suPadre = padre ? tx("su padre {0}", padre) : tx("su padre");
  if (motivo === "otro_dominio") return tx("Suelto: {0} es de otro dominio.", suPadre);
  return tx("Suelto: {0} no está en esta vista (filtros o tope del árbol).", suPadre);
}
