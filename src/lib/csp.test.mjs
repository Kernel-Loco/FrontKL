// RC-89: CSP con nonce del portal y cabeceras de next.config.ts. Sin red: lee la configuración y el código.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import nextConfig from "../../next.config.ts";
import { nuevoNonce, politicaDeContenido } from "./csp.ts";

const directivas = (csp) =>
  Object.fromEntries(csp.split(";").map((d) => d.trim().split(/\s+/)).map(([nombre, ...valores]) => [nombre, valores]));

test("1. cada nonce es nuevo y de 16 bytes en base64", () => {
  const nonces = new Set(Array.from({ length: 50 }, nuevoNonce));
  assert.equal(nonces.size, 50);
  for (const n of nonces) assert.equal(Buffer.from(n, "base64").length, 16);
});

test("2. script-src solo deja el nonce y lo que este cargue, sin 'unsafe-inline'", () => {
  const d = directivas(politicaDeContenido("abc123"));
  assert.deepEqual(d["script-src"], ["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  assert.deepEqual(d["default-src"], ["'self'"]);
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'none'"]);
  assert.deepEqual(d["connect-src"], ["'self'"]);
  // RC-283: la protección contra marcos se queda en la CSP completa.
  assert.deepEqual(d["frame-ancestors"], ["'none'"]);
  // 'unsafe-eval' solo con next dev.
  assert.ok(!politicaDeContenido("x").includes("unsafe-eval"));
  assert.ok(directivas(politicaDeContenido("x", true))["script-src"].includes("'unsafe-eval'"));
});

test("3. next.config.ts manda HSTS sin preload y las cabeceras de RC-283 en todo el portal", async () => {
  const reglas = await nextConfig.headers();
  const todo = reglas.find((r) => r.source === "/:path*");
  const cabeceras = Object.fromEntries(todo.headers.map((h) => [h.key, h.value]));
  assert.equal(cabeceras["Strict-Transport-Security"], "max-age=31536000; includeSubDomains");
  assert.equal(cabeceras["X-Frame-Options"], "DENY");
  assert.equal(cabeceras["X-Content-Type-Options"], "nosniff");
  assert.equal(cabeceras["Content-Security-Policy"], "frame-ancestors 'none'");
  // same-origin y no no-referrer: con no-referrer un POST de formulario sale con Origin: null (hallazgo 9 de RC-89).
  assert.equal(cabeceras["Referrer-Policy"], "same-origin");
  assert.doesNotMatch(cabeceras["Permissions-Policy"], /publickey-credentials/);
});

test("4. proxy.ts pone la CSP en la petición y en la respuesta, y cubre toda página", () => {
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /requestHeaders\.set\("Content-Security-Policy", csp\)/);
  assert.match(proxy, /response\.headers\.set\("Content-Security-Policy", csp\)/);
  // El matcher de la CSP solo deja fuera /api/v1/* y los archivos de _next (lo demás de /api/ y /favicon.ico dan
  // la página de no encontrado, con scripts).
  const source = proxy.match(/source: "([^"]+)"/)[1];
  const cubre = (ruta) => new RegExp(`^${source}$`).test(ruta);
  for (const ruta of ["/dashboard", "/demo", "/api", "/api/", "/api/v2/x", "/api/v1x", "/favicon.ico", "/terminos"])
    assert.ok(cubre(ruta), ruta);
  for (const ruta of ["/api/v1", "/api/v1/", "/api/v1/auth/me", "/_next/static/chunks/a.js", "/_next/image"])
    assert.ok(!cubre(ruta), ruta);
  // Solo se saltan las precargas de next/link, no las del navegador (Purpose: prefetch).
  assert.match(proxy, /missing: \[\{ type: "header", key: "next-router-prefetch" \}\]/);
  assert.doesNotMatch(proxy, /key: "purpose"/);
  // no-transform en cada página: Cloudflare no inyecta scripts sin nonce (hallazgo 4 de RC-89).
  assert.match(proxy, /const CACHE_PAGINA = "private, no-cache, no-store, max-age=0, must-revalidate, no-transform";/);
  // Los archivos de public/ se quedan con el Cache-Control de Next. Una página con punto (un dominio) no.
  const archivo = new RegExp(proxy.match(/const ARCHIVO_PUBLICO = \/(.+)\/i;/)[1], "i");
  for (const ruta of ["/lowtide-mark.svg", "/seguridad/arquitectura.png", "/favicon.ico"]) assert.ok(archivo.test(ruta), ruta);
  for (const ruta of ["/dashboard/dominios/olmardo.com", "/dashboard/dominios/acme-demo.mx", "/terminos"])
    assert.ok(!archivo.test(ruta), ruta);
  assert.match(proxy, /if \(!ARCHIVO_PUBLICO\.test\(pathname\)\) response\.headers\.set\("Cache-Control", CACHE_PAGINA\)/);
  assert.match(proxy, /response\.headers\.set\("Cache-Control", CACHE_PAGINA\)/);
  // Las rutas de sesión siguen en el matcher aunque sean precargas.
  for (const ruta of ['"/"', '"/dashboard/:path*"', '"/login/:path*"', '"/signup"']) assert.ok(proxy.includes(ruta), ruta);
});

test("5. el layout raíz pide render dinámico, sin él las páginas estáticas no llevan nonce", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /await connection\(\)/);
});
