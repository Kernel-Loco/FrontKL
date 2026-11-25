// Lo que el inventario muestra de los atributos de cada activo (HX4 de la auditoría del 15 nov). La API ya entrega
// `attributes` tal cual lo guarda cada fuente: aquí solo se eligen tecnologías, CDN, registrador, país y ASN, con
// las mismas claves que usan los recolectores, y se salta lo que la fuente dejó como 'No disponible'.
import type { Asset } from "@/types";

export interface DetalleActivo {
  etiqueta: string;
  valor: string;
}

const NO_DISPONIBLE = "No disponible";

/** Código del CDN -> nombre visible, los mismos que en el backend. */
export const CDN_NOMBRES: Record<string, string> = {
  akamai: "Akamai",
  aws_waf: "AWS WAF",
  azure_cdn: "Azure CDN",
  azure_front_door: "Azure Front Door",
  bunny: "Bunny",
  cloudflare: "Cloudflare",
  cloudfront: "Amazon CloudFront",
  edgio: "Edgio",
  fastly: "Fastly",
  imperva: "Imperva",
  netlify: "Netlify",
  sucuri: "Sucuri",
  vercel: "Vercel",
};

const texto = (valor: unknown): string | null =>
  typeof valor === "string" && valor.trim() && valor !== NO_DISPONIBLE ? valor.trim() : null;

function tecnologias(valor: unknown): string | null {
  if (!Array.isArray(valor)) return null;
  const nombres = valor
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const { nombre, version } = t as { nombre?: unknown; version?: unknown };
      const n = texto(nombre);
      if (!n) return null;
      const v = texto(version);
      return v ? `${n} ${v}` : n;
    })
    .filter((n): n is string => n !== null);
  return nombres.length ? nombres.join(", ") : null;
}

function asn(valor: unknown, proveedor: unknown): string | null {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 1) return null;
  const p = texto(proveedor);
  return p ? `AS${valor} · ${p}` : `AS${valor}`;
}

/** Detalles del activo, en este orden y sin vacíos. */
export function detallesDelActivo(asset: Pick<Asset, "attributes">): DetalleActivo[] {
  const a = asset.attributes ?? {};
  const cdn = texto(a.cdn);
  const candidatos: [string, string | null][] = [
    ["Tecnologías", tecnologias(a.tecnologias)],
    ["CDN", cdn ? (CDN_NOMBRES[cdn] ?? cdn) : null],
    ["Registrador", texto(a.registrador)],
    ["País", texto(a.pais)],
    ["ASN", asn(a.asn, a.proveedor)],
  ];
  return candidatos
    .filter((c): c is [string, string] => c[1] !== null)
    .map(([etiqueta, valor]) => ({ etiqueta, valor }));
}
