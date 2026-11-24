// RC-283: el 308 que quita la diagonal final (/api/v1/ a /api/v1) lleva las cabeceras de seguridad. Sin red: prueba la
// función y lee next.config.ts y src/proxy.ts. Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import nextConfig from "../../next.config.ts";
import { CABECERAS_REDIRECCION, sinDiagonalFinal } from "./diagonalFinal.ts";

test("1. quita la diagonal final y deja igual lo que no la trae", () => {
  assert.equal(sinDiagonalFinal("/api/v1/"), "/api/v1");
  assert.equal(sinDiagonalFinal("/api/v1/auth/me/"), "/api/v1/auth/me");
  assert.equal(sinDiagonalFinal("/login/"), "/login");
  assert.equal(sinDiagonalFinal("/login///"), "/login");
  for (const ruta of ["/", "/api/v1", "/login", "/dashboard/dominios/olmardo.com"])
    assert.equal(sinDiagonalFinal(ruta), null, ruta);
});

test("2. nunca deja una ruta relativa al protocolo (//otro-sitio)", () => {
  assert.equal(sinDiagonalFinal("//"), "/");
  assert.equal(sinDiagonalFinal("//evil.example/"), "/evil.example");
  assert.equal(sinDiagonalFinal("/a//b/"), "/a/b");
  for (const ruta of ["//", "//evil.example/", "///evil.example//", "/a//b/"])
    assert.doesNotMatch(sinDiagonalFinal(ruta), /^\/\//, ruta);
});

test("3. el 308 lleva las mismas cabeceras que el resto del portal, con las tres de RC-283", async () => {
  const reglas = await nextConfig.headers();
  const todo = reglas.find((r) => r.source === "/:path*");
  assert.deepEqual(CABECERAS_REDIRECCION, todo.headers);
  const cabeceras = Object.fromEntries(CABECERAS_REDIRECCION.map((h) => [h.key, h.value]));
  assert.equal(cabeceras["X-Frame-Options"], "DENY");
  assert.equal(cabeceras["Content-Security-Policy"], "frame-ancestors 'none'");
  assert.equal(cabeceras["X-Content-Type-Options"], "nosniff");
});

test("4. Next no redirige solo y proxy.ts hace el 308 para toda ruta con diagonal final", () => {
  assert.equal(nextConfig.skipTrailingSlashRedirect, true);
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /const sinDiagonal = sinDiagonalFinal\(pathname\);/);
  assert.match(proxy, /NextResponse\.redirect\(destino, 308\)/);
  assert.match(proxy, /for \(const \{ key, value \} of CABECERAS_REDIRECCION\) redireccion\.headers\.set\(key, value\);/);
  // Antes que la redirección de sesión: /login/ con cookie primero pierde la diagonal.
  assert.ok(proxy.indexOf("sinDiagonalFinal(pathname)") < proxy.indexOf("proxyRedirect(request.nextUrl.pathname"));
  // El matcher incluye toda ruta con diagonal final, sin saltarse las precargas.
  assert.match(proxy, /^ {4}"\/:ruta\+\/",$/m);
});
