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
  assert.equal(cabeceras["Referrer-Policy"], "no-referrer");
  assert.doesNotMatch(cabeceras["Permissions-Policy"], /publickey-credentials/);
});

test("4. proxy.ts pone la CSP en la petición y en la respuesta, y cubre toda página", () => {
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /requestHeaders\.set\("Content-Security-Policy", csp\)/);
  assert.match(proxy, /response\.headers\.set\("Content-Security-Policy", csp\)/);
  assert.match(proxy, /source: "\/\(\(\?!api\/\|_next\/static\|_next\/image\|favicon\.ico\)\.\*\)"/);
  // Las rutas de sesión siguen en el matcher aunque sean precargas.
  for (const ruta of ['"/"', '"/dashboard/:path*"', '"/login/:path*"', '"/signup"']) assert.ok(proxy.includes(ruta), ruta);
});

test("5. el layout raíz pide render dinámico, sin él las páginas estáticas no llevan nonce", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /await connection\(\)/);
});
