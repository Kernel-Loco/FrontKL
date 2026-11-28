// Comparación con el inventario del cliente (#146, RC-264). El cliente sube un CSV con los activos que conoce y el
// portal marca cada activo descubierto como 'En tu inventario' o 'Desconocido'. Todo corre en el navegador: este
// módulo solo recibe el texto del archivo y la lista de activos, no guarda nada ni hace consultas.
//
// Reglas:
// - El CSV trae una columna de valor (FQDN o IP) y, opcional, una de tipo. Con encabezado se buscan por nombre;
//   sin encabezado la primera columna es el valor y la segunda el tipo. Separador ',', ';' o tabulador.
// - Se normaliza igual de los dos lados: sin espacios a los lados, minúsculas, sin punto final, nombres con acentos
//   en punycode, IPv4 en decimal sin ceros a la izquierda (como el módulo ipaddress de Python, que los rechaza) e
//   IPv6 en la forma corta de RFC 5952. `*.dominio` cubre cualquier subdominio de dominio, no al dominio mismo.
// - Una fila que no es FQDN ni IP, o cuyo tipo contradice al valor, se ignora y se cuenta. Rangos CIDR, URL y
//   puertos cuentan como inválidos.
// - Un servicio (198.51.100.10:443/tcp) se compara por su IP o host, un certificado por el subdominio al que
//   pertenece, un correo por su dominio y una documentación de API (api_doc, una URL) por su host. Así todo activo
//   queda en uno de los dos estados.
// - Una comilla que no se cierra se toma como carácter normal y el resto del archivo se lee sin comillas, para no
//   juntar miles de filas en una sola celda.

import type { Asset } from "@/types";
import { tx } from "@/i18n/tx";

/** Tope del archivo: 1 MB. */
export const MAX_BYTES = 1024 * 1024;
/** Tope de filas con datos, sin contar el encabezado ni las filas vacías. */
export const MAX_FILAS = 5000;

export type EstadoInventario = "inventario" | "desconocido";

export interface EntradaInventario {
  /** Valor normalizado. En un comodín es el dominio de debajo, sin el `*.`. */
  valor: string;
  clase: "fqdn" | "ip";
  comodin: boolean;
}

export interface InventarioLeido {
  entradas: EntradaInventario[];
  invalidas: number;
  duplicadas: number;
}

export interface ResultadoComparacion {
  estados: Map<string, EstadoInventario>;
  enInventario: number;
  desconocidos: number;
  /** Lo que está en el CSV y LowTide no vio, con el `*.` de vuelta en los comodines. */
  noVistos: string[];
}

export class InventarioError extends Error {}

// ---------------------------------------------------------------- Normalización

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const ETIQUETA = /^(?!-)[a-z0-9_-]{1,63}(?<!-)$/;

function octetos(texto: string): number[] | null {
  const m = IPV4.exec(texto);
  if (!m) return null;
  const partes = m.slice(1);
  if (partes.some((p) => p.length > 1 && p.startsWith("0"))) return null;
  const numeros = partes.map(Number);
  return numeros.every((n) => n <= 255) ? numeros : null;
}

export function normalizarIpv4(texto: string): string | null {
  return octetos(texto)?.join(".") ?? null;
}

/** IPv6 en la forma corta de RFC 5952, o null. Acepta corchetes y un IPv4 al final (::ffff:192.0.2.1). */
export function normalizarIpv6(texto: string): string | null {
  let t = texto;
  if (t.startsWith("[") && t.endsWith("]")) t = t.slice(1, -1);
  if (!t.includes(":") || !/^[0-9a-f:.]+$/.test(t)) return null;
  let grupos: number[] = [];
  const ultimo = t.lastIndexOf(":");
  const cola = t.slice(ultimo + 1);
  if (cola.includes(".")) {
    const v4 = octetos(cola);
    if (!v4) return null;
    t = `${t.slice(0, ultimo + 1)}${((v4[0]! << 8) | v4[1]!).toString(16)}:${((v4[2]! << 8) | v4[3]!).toString(16)}`;
  }
  const mitades = t.split("::");
  if (mitades.length > 2) return null;
  const leer = (parte: string): number[] | null => {
    if (parte === "") return [];
    const piezas = parte.split(":");
    if (piezas.some((p) => !/^[0-9a-f]{1,4}$/.test(p))) return null;
    return piezas.map((p) => parseInt(p, 16));
  };
  const izquierda = leer(mitades[0]!);
  const derecha = mitades.length === 2 ? leer(mitades[1]!) : [];
  if (!izquierda || !derecha) return null;
  if (mitades.length === 2) {
    const faltan = 8 - izquierda.length - derecha.length;
    if (faltan < 1) return null;
    grupos = [...izquierda, ...Array<number>(faltan).fill(0), ...derecha];
  } else {
    grupos = izquierda;
  }
  if (grupos.length !== 8) return null;
  // La corrida de ceros más larga, de 2 grupos o más, y la primera si empatan.
  let inicio = -1;
  let largo = 0;
  for (let i = 0; i < 8; ) {
    if (grupos[i] !== 0) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < 8 && grupos[j] === 0) j += 1;
    if (j - i > largo) {
      inicio = i;
      largo = j - i;
    }
    i = j;
  }
  const hex = grupos.map((g) => g.toString(16));
  if (largo < 2) return hex.join(":");
  return `${hex.slice(0, inicio).join(":")}::${hex.slice(inicio + largo).join(":")}`;
}

/** Nombre de host con al menos dos etiquetas, en minúsculas, sin punto final y en punycode, o null. */
export function normalizarFqdn(texto: string): string | null {
  let t = texto.endsWith(".") ? texto.slice(0, -1) : texto;
  if (/[^\x21-\x7e]/.test(t)) {
    // URL acepta rutas, puertos y usuario: con ellos hostname devolvería solo un pedazo del texto.
    if (/[\s/?#@:[\]\\%]/.test(t)) return null;
    try {
      t = new URL(`http://${t}`).hostname;
    } catch {
      return null;
    }
  }
  if (t.length === 0 || t.length > 253) return null;
  const etiquetas = t.split(".");
  if (etiquetas.length < 2 || !etiquetas.every((e) => ETIQUETA.test(e))) return null;
  // La última etiqueta no es solo números: 1.2.3.999 no es un nombre.
  if (/^\d+$/.test(etiquetas[etiquetas.length - 1]!)) return null;
  return t;
}

/** Valor del CSV o de la API normalizado. Devuelve null si no es FQDN, IP ni comodín. */
export function normalizarValor(texto: string): EntradaInventario | null {
  const t = texto.trim().toLowerCase();
  if (t === "" || /\s/.test(t)) return null;
  const ip = normalizarIpv4(t) ?? normalizarIpv6(t);
  if (ip) return { valor: ip, clase: "ip", comodin: false };
  if (t.startsWith("*.")) {
    const base = normalizarFqdn(t.slice(2));
    return base ? { valor: base, clase: "fqdn", comodin: true } : null;
  }
  const fqdn = normalizarFqdn(t);
  return fqdn ? { valor: fqdn, clase: "fqdn", comodin: false } : null;
}

// ---------------------------------------------------------------- Lectura del CSV

/** Filas de un CSV con comillas dobles al estilo RFC 4180. Una comilla abre solo al inicio de la celda, aunque
 *  vaya después de espacios. Si una comilla llega al final del archivo sin cerrarse, se vuelve a leer desde ella
 *  como carácter normal y sin comillas, una sola vez, así que el costo sigue siendo lineal. */
export function partirCsv(texto: string, separador: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  // La celda solo lleva espacios o tabuladores hasta aquí. Una bandera y no una regex sobre celda, que haría
  // cuadrático un archivo con muchas comillas en medio de una celda larga.
  let celdaEnBlanco = true;
  let entreComillas = false;
  let sinComillas = false;
  let apertura = -1;
  let celdaAntes = "";
  for (let i = 0; ; i += 1) {
    if (i >= texto.length) {
      if (!entreComillas) break;
      // Entre comillas no se cierra ninguna celda ni fila, así que basta con volver a la celda de antes.
      celda = `${celdaAntes}"`;
      celdaEnBlanco = false;
      entreComillas = false;
      sinComillas = true;
      i = apertura;
      continue;
    }
    const c = texto[i]!;
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i += 1;
        } else {
          entreComillas = false;
          celdaEnBlanco = false;
        }
      } else {
        celda += c;
      }
    } else if (c === '"' && !sinComillas && celdaEnBlanco) {
      apertura = i;
      celdaAntes = celda;
      celda = "";
      entreComillas = true;
    } else if (c === separador) {
      fila.push(celda);
      celda = "";
      celdaEnBlanco = true;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i += 1;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
      celdaEnBlanco = true;
    } else {
      celda += c;
      if (c !== " " && c !== "\t") celdaEnBlanco = false;
    }
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

const NOMBRES_VALOR = new Set(["valor", "value", "activo", "asset", "fqdn", "host", "hostname", "ip", "dominio", "domain", "subdominio", "subdomain", "nombre", "name"]);
const NOMBRES_TIPO = new Set(["tipo", "type", "clase", "kind"]);
const TIPOS_IP = new Set(["ip", "ipv4", "ipv6", "direccion ip", "dirección ip"]);
const TIPOS_FQDN = new Set(["fqdn", "dominio", "domain", "subdominio", "subdomain", "host", "hostname", "nombre", "dns", "comodin", "comodín", "wildcard"]);

/** El separador más usado en la primera fila, sin contar los que van entre comillas. Una comilla abre igual que en
 *  partirCsv: al inicio de la celda para cualquiera de los tres separadores. */
export function separadorDe(texto: string): string {
  const cuentas: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let entreComillas = false;
  let inicioDeCelda = true;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i]!;
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          i += 1;
        } else {
          entreComillas = false;
          inicioDeCelda = false;
        }
      }
      continue;
    }
    if (c === "\n" || c === "\r") break;
    if (c in cuentas) {
      cuentas[c]! += 1;
      inicioDeCelda = true;
    } else if (c === '"' && inicioDeCelda) {
      entreComillas = true;
    } else if (c !== " ") {
      inicioDeCelda = false;
    }
  }
  if (entreComillas) {
    // La comilla no se cierra en todo el archivo: partirCsv la toma como carácter normal, así que aquí también.
    const primera = texto.split(/[\r\n]/, 1)[0] ?? "";
    for (const s of Object.keys(cuentas)) cuentas[s] = primera.split(s).length - 1;
  }
  const opciones = Object.entries(cuentas).sort((a, b) => b[1] - a[1]);
  return opciones[0]![1] > 0 ? opciones[0]![0] : ",";
}

/** Lee el texto del CSV. Lanza InventarioError si pasa de 1 MB o de 5,000 filas, si no trae ninguna fila o si solo
 *  trae el encabezado. */
export function leerInventario(texto: string): InventarioLeido {
  if (new TextEncoder().encode(texto).length > MAX_BYTES) throw new InventarioError(tx("El archivo pasa de 1 MB."));
  const limpio = texto.startsWith("﻿") ? texto.slice(1) : texto;
  const filas = partirCsv(limpio, separadorDe(limpio)).filter((f) => f.some((c) => c.trim() !== ""));
  if (filas.length === 0) throw new InventarioError(tx("El archivo no trae filas."));

  let columnaValor = 0;
  let columnaTipo: number | null = null;
  let datos = filas;
  const encabezado = filas[0]!.map((c) => c.trim().toLowerCase());
  const valorEnEncabezado = encabezado.findIndex((c) => NOMBRES_VALOR.has(c));
  if (valorEnEncabezado >= 0 && !encabezado.some((c) => normalizarValor(c))) {
    columnaValor = valorEnEncabezado;
    const tipo = encabezado.findIndex((c) => NOMBRES_TIPO.has(c));
    columnaTipo = tipo >= 0 ? tipo : null;
    datos = filas.slice(1);
  } else if (filas.some((f) => f.length > 1)) {
    columnaTipo = 1;
  }
  if (datos.length === 0) throw new InventarioError(tx("El archivo solo trae el encabezado, sin activos."));
  if (datos.length > MAX_FILAS) throw new InventarioError(tx("El archivo trae {0} filas y el tope es de 5,000.", datos.length.toLocaleString("es-MX")));

  const vistas = new Set<string>();
  const entradas: EntradaInventario[] = [];
  let invalidas = 0;
  let duplicadas = 0;
  for (const fila of datos) {
    const entrada = normalizarValor(fila[columnaValor] ?? "");
    const tipo = columnaTipo === null ? "" : (fila[columnaTipo] ?? "").trim().toLowerCase();
    const contradice = entrada !== null && ((TIPOS_IP.has(tipo) && entrada.clase !== "ip") || (TIPOS_FQDN.has(tipo) && entrada.clase !== "fqdn"));
    if (!entrada || contradice) {
      invalidas += 1;
      continue;
    }
    const llave = `${entrada.comodin ? "*." : ""}${entrada.valor}`;
    if (vistas.has(llave)) {
      duplicadas += 1;
      continue;
    }
    vistas.add(llave);
    entradas.push(entrada);
  }
  return { entradas, invalidas, duplicadas };
}

// ---------------------------------------------------------------- Comparación

/** Lo que se compara de cada activo: el valor, la IP o host de un servicio, el subdominio de un certificado, el
 *  dominio de un correo o el host de la URL de una documentación de API. */
export function llaveDelActivo(asset: Pick<Asset, "type" | "value" | "parent" | "attributes">): string | null {
  let texto = asset.value;
  if (asset.type === "service") {
    const sinProtocolo = texto.replace(/\/[a-z]+$/i, "");
    const v6 = /^\[([^\]]+)\](?::\d+)?$/.exec(sinProtocolo);
    texto = v6 ? v6[1]! : sinProtocolo.includes("::") || sinProtocolo.split(":").length > 2 ? sinProtocolo : sinProtocolo.replace(/:\d+$/, "");
  } else if (asset.type === "certificate") {
    const sujeto = asset.attributes?.subject;
    texto = asset.parent ?? (typeof sujeto === "string" ? sujeto : "");
  } else if (asset.type === "email") {
    texto = texto.slice(texto.lastIndexOf("@") + 1);
  } else if (asset.type === "api_doc") {
    // URL.hostname ya viene en minúsculas y en punycode, y una IPv6 con corchetes, que normalizarIpv6 acepta.
    try {
      texto = new URL(texto).hostname;
    } catch {
      texto = "";
    }
  }
  const entrada = normalizarValor(texto);
  return entrada && !entrada.comodin ? entrada.valor : null;
}

function cubre(entrada: EntradaInventario, llave: string): boolean {
  return entrada.comodin ? llave.endsWith(`.${entrada.valor}`) : llave === entrada.valor;
}

export function compararInventario(assets: Pick<Asset, "id" | "type" | "value" | "parent" | "attributes">[], inventario: EntradaInventario[]): ResultadoComparacion {
  const exactas = new Set(inventario.filter((e) => !e.comodin).map((e) => e.valor));
  const comodines = inventario.filter((e) => e.comodin);
  const usadas = new Set<EntradaInventario>();
  const estados = new Map<string, EstadoInventario>();
  const llaves = new Set<string>();
  let enInventario = 0;
  for (const asset of assets) {
    const llave = llaveDelActivo(asset);
    if (llave) llaves.add(llave);
    const conocido = llave !== null && (exactas.has(llave) || comodines.some((c) => cubre(c, llave)));
    estados.set(asset.id, conocido ? "inventario" : "desconocido");
    if (conocido) enInventario += 1;
  }
  for (const c of comodines) if ([...llaves].some((l) => cubre(c, l))) usadas.add(c);
  const noVistos = inventario
    .filter((e) => (e.comodin ? !usadas.has(e) : !llaves.has(e.valor)))
    .map((e) => (e.comodin ? `*.${e.valor}` : e.valor));
  return { estados, enInventario, desconocidos: assets.length - enInventario, noVistos };
}

/** Filas para exportar los desconocidos con toCsv, que antepone la comilla a =, +, - y @. */
export function filasDesconocidos(assets: Asset[], estados: Map<string, EstadoInventario>): Record<string, string>[] {
  return assets
    .filter((a) => estados.get(a.id) === "desconocido")
    .map((a) => ({ valor: a.value, tipo: a.type, pertenece_a: a.parent ?? "", visto_por_ultima_vez: a.last_seen_at }));
}
