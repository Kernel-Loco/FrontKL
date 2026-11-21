// Asistente de IA sobre los hallazgos (#38, RC-77). La API (POST /api/v1/domains/{fqdn}/assistant de BackKL) responde
// una sola pregunta por vez sobre 1 a 20 hallazgos abiertos del dominio. Al modelo solo le pasa la pregunta y el título,
// la categoría y la criticidad de esos hallazgos. Aquí van las reglas que no dependen de React, para probarlas sin
// navegador.
import type { Severity } from "@/types";

/** Topes de `AssistantQuestion` en cirdan/api/asistente.py. */
export const MAX_HALLAZGOS_ASISTENTE = 20;
export const MAX_LARGO_PREGUNTA = 1000;

/** Preguntas por usuario cada 24 horas (`take_assistant_question` de la API). */
export const LIMITE_DIARIO_ASISTENTE = 20;

/**
 * Tope de la API para toda la pregunta (`ASSISTANT_DEADLINE_SECONDS`), sumando los dos proveedores y la resolución de
 * nombres: la llamada corre en un hilo y la API deja de esperarla a los 30 s.
 */
export const TIEMPO_API_ASISTENTE_MS = 30_000;

/**
 * Tope del navegador para una pregunta. Va por encima del corte del reenvío de Next (`experimental.proxyTimeout` de
 * next.config.ts), que a su vez va por encima de la API: así el 503 de la API llega con su mensaje y no se cambia por
 * un 500 genérico del reenvío ni por un tiempo agotado del navegador.
 */
export const TIEMPO_MAXIMO_ASISTENTE_MS = 45_000;

const ORDEN_SEVERIDAD: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Hallazgos que van en la pregunta: los más graves de la lista que ve la persona, hasta el tope de la API. Respeta el
 * orden de la lista entre los de la misma criticidad y no repite ids, porque la API rechaza los repetidos.
 */
export function hallazgosParaAsistente<T extends { id: string; severity: Severity }>(hallazgos: readonly T[]): T[] {
  const vistos = new Set<string>();
  const unicos = hallazgos.filter((hallazgo) => {
    if (vistos.has(hallazgo.id)) return false;
    vistos.add(hallazgo.id);
    return true;
  });
  return unicos
    .map((hallazgo, indice) => ({ hallazgo, indice }))
    .sort((a, b) => ORDEN_SEVERIDAD[a.hallazgo.severity] - ORDEN_SEVERIDAD[b.hallazgo.severity] || a.indice - b.indice)
    .slice(0, MAX_HALLAZGOS_ASISTENTE)
    .map(({ hallazgo }) => hallazgo);
}

/** La pregunta lista para mandarse, o `null` si queda vacía o pasa del tope. */
export function preguntaValida(texto: string): string | null {
  const pregunta = texto.trim();
  return pregunta && pregunta.length <= MAX_LARGO_PREGUNTA ? pregunta : null;
}

export type CodigoFallaAsistente = "assistant_404" | "assistant_429" | "assistant_503";

const CODIGOS_DE_FALLA: Partial<Record<number, CodigoFallaAsistente>> = {
  404: "assistant_404",
  429: "assistant_429",
  503: "assistant_503",
};

/**
 * Fallas de la API con mensaje propio que se muestra tal cual, en vez del genérico: 404 (el dominio o un hallazgo ya
 * no está abierto, se arregla recargando la lista), 429 (límite de preguntas del día) y 503 (ningún proveedor
 * respondió). `null` si el status es otro o no trae el `{ detail: "..." }` de FastAPI.
 */
export function fallaDelAsistente(status: number, detail: unknown): { codigo: CodigoFallaAsistente; mensaje: string } | null {
  const codigo = CODIGOS_DE_FALLA[status];
  const mensaje = detail && typeof detail === "object" && "detail" in detail ? detail.detail : undefined;
  return codigo && typeof mensaje === "string" && mensaje.trim() ? { codigo, mensaje } : null;
}

export interface Tramo {
  texto: string;
  negrita: boolean;
}

/**
 * `inicio` es el número del primer elemento: una lista numerada partida por un párrafo sigue su cuenta. En una tabla,
 * cada fila trae tantas celdas como encabezados.
 */
export type Bloque =
  | { tipo: "parrafo"; tramos: Tramo[] }
  | { tipo: "lista"; elementos: Tramo[][] }
  | { tipo: "numerada"; inicio: number; elementos: Tramo[][] }
  | { tipo: "tabla"; encabezados: Tramo[][]; filas: Tramo[][][] };

/** `**negritas**` de una línea. Un `**` sin cerrar se queda como texto. */
function tramos(linea: string): Tramo[] {
  const partes = linea.split("**");
  if (partes.length % 2 === 0) return [{ texto: linea, negrita: false }];
  return partes.map((texto, indice) => ({ texto, negrita: indice % 2 === 1 })).filter((tramo) => tramo.texto);
}

const VIÑETA = /^\s*[-*•]\s+/;
const NUMERO = /^\s*(\d{1,2})[.)]\s+/;
const TITULO = /^\s*#{1,6}\s+/;
/** La línea `|---|:---:|` que va debajo de los encabezados de una tabla de markdown. */
const SEPARADOR_DE_TABLA = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

const esSeparadorDeTabla = (linea: string | undefined) =>
  linea !== undefined && linea.includes("|") && SEPARADOR_DE_TABLA.test(linea);

/** Celdas de una fila de tabla: sin las barras de las orillas, con `\|` como barra dentro de la celda. */
function celdas(linea: string): string[] {
  let fila = linea.trim();
  if (fila.startsWith("|")) fila = fila.slice(1);
  if (fila.endsWith("|") && !fila.endsWith("\\|")) fila = fila.slice(0, -1);
  return fila.split(/(?<!\\)\|/).map((celda) => celda.replaceAll("\\|", "|").replace(/<br\s*\/?>/gi, " ").trim());
}

/**
 * Convierte la respuesta del modelo en párrafos, listas y tablas para mostrarla con elementos de React. Nunca se pinta
 * como HTML: el texto del modelo no es confiable (#79), así que solo se reconocen viñetas, listas numeradas, tablas
 * de markdown (encabezados, la línea `|---|` y sus filas), títulos de markdown (como párrafo en negritas) y
 * `**negritas**`. Lo demás queda como texto tal cual.
 */
export function bloquesDeRespuesta(respuesta: string): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: "parrafo", tramos: tramos(parrafo.join(" ")) });
    parrafo = [];
  };

  const lineas = respuesta.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (linea.includes("|") && !esSeparadorDeTabla(linea) && esSeparadorDeTabla(lineas[i + 1])) {
      cerrarParrafo();
      const encabezados = celdas(linea);
      const filas: string[][] = [];
      i += 2;
      for (; i < lineas.length && lineas[i].includes("|") && lineas[i].trim(); i++) {
        if (!esSeparadorDeTabla(lineas[i])) filas.push(celdas(lineas[i]));
      }
      i--;
      // Ninguna celda se pierde: si una fila trae más que los encabezados, la tabla crece con encabezados vacíos.
      const ancho = Math.max(encabezados.length, ...filas.map((fila) => fila.length));
      const completar = (fila: string[]) => Array.from({ length: ancho }, (_, columna) => tramos(fila[columna] ?? ""));
      bloques.push({ tipo: "tabla", encabezados: completar(encabezados), filas: filas.map(completar) });
      continue;
    }
    const tipo = VIÑETA.test(linea) ? "lista" : NUMERO.test(linea) ? "numerada" : null;
    if (tipo) {
      cerrarParrafo();
      const elemento = tramos(linea.replace(tipo === "lista" ? VIÑETA : NUMERO, "").trim());
      const ultimo = bloques.at(-1);
      if (ultimo && ultimo.tipo === tipo) ultimo.elementos.push(elemento);
      else if (tipo === "lista") bloques.push({ tipo, elementos: [elemento] });
      else bloques.push({ tipo, inicio: Number(NUMERO.exec(linea)?.[1] ?? 1), elementos: [elemento] });
    } else if (TITULO.test(linea)) {
      cerrarParrafo();
      const texto = linea.replace(TITULO, "").replaceAll("**", "").trim();
      if (texto) bloques.push({ tipo: "parrafo", tramos: [{ texto, negrita: true }] });
    } else if (linea.trim()) {
      parrafo.push(linea.trim());
    } else {
      cerrarParrafo();
    }
  }
  cerrarParrafo();
  return bloques;
}

/**
 * Hallazgos que cita la respuesta, como números de 1 a `total`, en el orden en que aparecen por primera vez. La API
 * le pasa al modelo cada hallazgo con el id H1, H2... en el orden de `finding_ids`, y el modelo los cita entre
 * corchetes: `[H1]`, `[H1, H3]` o `[H2 y H4]`. Un número fuera de los enviados no cuenta.
 */
export function citasDeRespuesta(respuesta: string, total: number): number[] {
  const citas: number[] = [];
  for (const [grupo] of respuesta.matchAll(/\[\s*H\d{1,2}(?:\s*(?:,|y)\s*H\d{1,2})*\s*\]/g)) {
    for (const [, numero] of grupo.matchAll(/H(\d{1,2})/g)) {
      const n = Number(numero);
      if (n >= 1 && n <= total && !citas.includes(n)) citas.push(n);
    }
  }
  return citas;
}
