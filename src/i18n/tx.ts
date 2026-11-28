// Traducción del portal (RC-374). El texto en español es la llave: tx("Hallazgos") da "Findings" en inglés y el mismo
// texto en español o si todavía no tiene traducción. Funciona en componentes de servidor, de cliente y en funciones
// auxiliares, sin hooks:
// - en el navegador, el idioma sale de <html lang>, que el servidor pinta con el de la cookie;
// - en el servidor, de la cookie de la petición en curso (serverLocale.ts, que carga el layout raíz).
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { EN } from "./en";

type LocaleReader = () => string | undefined;
const registry = globalThis as typeof globalThis & { __lowtideLocale?: LocaleReader };

export function activeLocale(): Locale {
  const value = typeof document !== "undefined" ? document.documentElement.lang : registry.__lowtideLocale?.();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Texto en el idioma activo. Los {0}, {1}… se llenan con `args`, en orden. */
export function tx(text: string, ...args: unknown[]): string {
  const base = activeLocale() === "en" ? (EN[text] ?? text) : text;
  return args.length ? base.replace(/\{(\d+)\}/g, (hole, index: string) => (index in args ? String(args[Number(index)]) : hole)) : base;
}

/**
 * Objetos de textos fijos del módulo (etiquetas, opciones, mensajes): se leen traducidos en cada acceso, porque el
 * módulo se evalúa una sola vez y el idioma cambia por petición.
 *
 * Solo se traduce lo que parece texto para leer (con mayúscula inicial, espacios o acentos) y nunca bajo llaves de
 * identificadores: los mismos objetos guardan valores que viajan a la API o se comparan ("activo", "dominios",
 * value, id, code…), y esos no cambian con el idioma.
 */
const ID_KEYS = new Set(["value", "valor", "id", "key", "code", "codigo", "href", "kind", "type", "tipo", "status", "estado", "tone",
  "variant", "format", "field", "category", "severity", "section", "mode", "modo", "icon", "path", "url", "fqdn", "domain", "grouping", "agrupar"]);
const looksLikeText = (value: string) => /^[A-ZÁÉÍÓÚÑ¿¡]|\s|[áéíóúñü]/.test(value);
const isPlain = (value: object) => {
  const proto = Object.getPrototypeOf(value);
  return (proto === Object.prototype || proto === Array.prototype || proto === null) && !("$$typeof" in value);
};

export function localized<T extends object>(source: T): T {
  return new Proxy(source, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof key === "string" && ID_KEYS.has(key)) return value;
      if (typeof value === "string") return looksLikeText(value) ? tx(value) : value;
      if (value && typeof value === "object" && !Object.isFrozen(value) && isPlain(value)) return localized(value);
      return value;
    },
  });
}

/** Formato de fechas y números según el idioma activo. */
export const intlLocale = (): string => (activeLocale() === "en" ? "en-US" : "es-MX");
