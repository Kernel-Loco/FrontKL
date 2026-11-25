// Quitar la diagonal final de una ruta (RC-283). Sin imports para probarlo con node --test.
//
// Next quita la diagonal final con un 308 propio que no lleva las cabeceras de headers() de next.config.ts (en
// Next 16.4 la redirección interna responde con resHeaders en null). Así /api/v1/ y /login/ salían sin
// X-Frame-Options, CSP ni nosniff. next.config.ts apaga esa redirección (skipTrailingSlashRedirect) y la hace
// src/proxy.ts con esta función y estas cabeceras.

/** Las mismas que SECURITY_HEADERS de next.config.ts. Lo revisa diagonalFinal.test.mjs. */
export const CABECERAS_REDIRECCION: ReadonlyArray<{ key: string; value: string }> = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=()" },
];

/** La ruta sin la diagonal final, o null si no termina en diagonal. Junta las diagonales repetidas, como hace Next
 * con su destino, para que la redirección nunca quede como //otro-sitio (una ruta relativa al protocolo). */
export function sinDiagonalFinal(pathname: string): string | null {
  if (pathname === "/" || !pathname.endsWith("/")) return null;
  return pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
}
