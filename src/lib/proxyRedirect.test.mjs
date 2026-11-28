// Pruebas sin red de las redirecciones de src/proxy.ts (M1 de la revisión de RC-63). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LOGIN_LINK_PATH } from "./loginLink.ts";
import { ALWAYS_OPEN, proxyRedirect } from "./proxyRedirect.ts";

test("1. la página del enlace se abre con o sin cookie, para que el #t= llegue al canje", () => {
  assert.deepEqual(ALWAYS_OPEN, [LOGIN_LINK_PATH]);
  assert.equal(proxyRedirect(LOGIN_LINK_PATH, true), null, "con una cookie vencida o de otra persona");
  assert.equal(proxyRedirect(LOGIN_LINK_PATH, false), null);
});

test("2. lo demás sigue igual", () => {
  assert.equal(proxyRedirect("/", true), "/dashboard");
  assert.equal(proxyRedirect("/", false), null); // la página de inicio (RC-379)
  assert.equal(proxyRedirect("/dashboard", false), "/login");
  assert.equal(proxyRedirect("/dashboard/dominios", false), "/login");
  assert.equal(proxyRedirect("/dashboard", true), null);
  assert.equal(proxyRedirect("/login", true), "/dashboard");
  assert.equal(proxyRedirect("/login/mfa", true), "/dashboard");
  assert.equal(proxyRedirect("/signup", true), "/dashboard");
  assert.equal(proxyRedirect("/login", false), null);
  assert.equal(proxyRedirect("/login/enlacex", true), "/dashboard", "solo esa ruta, no las que empiezan igual");
});

test("3. proxy.ts usa estas reglas", () => {
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /proxyRedirect\(request\.nextUrl\.pathname, hasSession\)/);
  assert.ok(!proxy.includes("GUEST_ONLY"), "las reglas viven en un solo lugar");
});
