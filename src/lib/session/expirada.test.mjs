// Pruebas sin red de /auth/expirada (RC-301). Node 22.18 o más nuevo:
//   npm test
// Antes la ruta borraba la cookie siempre: un enlace desde otro sitio sacaba al usuario con la sesión viva.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkSession } from "./check.ts";
import { decideExpirada } from "./expirada.ts";
import { loginNoticeFrom } from "./logout.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const sinComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const failureStatus = (error) => (error instanceof DOMException && error.name === "TimeoutError" ? 504 : 0);

/** GET /auth/me falso que cuenta sus llamadas. `respuesta` es un status o un error para rechazar. */
function apiMe(respuesta) {
  const llamadas = { n: 0 };
  const check = () => {
    llamadas.n += 1;
    const request =
      typeof respuesta === "number"
        ? () => Promise.resolve(new Response(JSON.stringify({ id: "u1", role: "analyst" }), { status: respuesta }))
        : () => Promise.reject(respuesta);
    return checkSession(request, failureStatus);
  };
  return { check, llamadas };
}

const decide = (requested, fetchSite, hasCookie, check) =>
  decideExpirada({ requested, notice: loginNoticeFrom(requested), fetchSite, hasCookie, check });

const SIN_RED = new TypeError("fetch failed");
const TIEMPO = new DOMException("timeout", "TimeoutError");

test("un enlace desde otro sitio con la sesión viva no borra la cookie, con o sin ?notice", async () => {
  for (const requested of [null, "logout", "expired", "max", "ended"]) {
    for (const fetchSite of ["cross-site", "same-site", "none", null]) {
      const api = apiMe(200);
      const salida = await decide(requested, fetchSite, true, api.check);
      assert.deepEqual(salida, { clearCookie: false, location: "/dashboard" }, `${requested} ${fetchSite}`);
      assert.equal(api.llamadas.n, 1, "pregunta a /auth/me");
    }
  }
});

test("desde otro sitio con la API caída tampoco borra: va al panel, que muestra el aviso de servicio caído", async () => {
  for (const respuesta of [403, 429, 500, 502, 503, 504, SIN_RED, TIEMPO]) {
    const api = apiMe(respuesta);
    assert.deepEqual(await decide("logout", "cross-site", true, api.check), { clearCookie: false, location: "/dashboard" });
  }
});

test("cerrar sesión desde el portal borra la cookie sin llamar a la API, aunque esté caída", async () => {
  for (const notice of ["logout", "expired", "max"]) {
    const api = apiMe(SIN_RED);
    assert.deepEqual(await decide(notice, "same-origin", true, api.check), {
      clearCookie: true,
      location: `/login?notice=${notice}`,
    });
    assert.equal(api.llamadas.n, 0);
  }
});

test("del mismo origen sin aviso de salida (apiClient y el layout) pregunta a /auth/me y solo el 401 borra", async () => {
  for (const requested of [null, "ended", "otro"]) {
    assert.deepEqual(await decide(requested, "same-origin", true, apiMe(401).check), {
      clearCookie: true,
      location: "/login?notice=ended",
    });
    for (const respuesta of [200, 403, 429, 500, 503, SIN_RED, TIEMPO]) {
      assert.deepEqual(await decide(requested, "same-origin", true, apiMe(respuesta).check), {
        clearCookie: false,
        location: "/dashboard",
      });
    }
  }
});

test("con 401 de /auth/me borra desde cualquier origen y conserva el aviso conocido", async () => {
  for (const fetchSite of ["cross-site", "same-site", "none", null]) {
    assert.deepEqual(await decide("expired", fetchSite, true, apiMe(401).check), {
      clearCookie: true,
      location: "/login?notice=expired",
    });
  }
});

test("sin cookie va al login sin mandar Set-Cookie ni llamar a la API", async () => {
  for (const fetchSite of ["same-origin", "cross-site", null]) {
    const api = apiMe(200);
    assert.deepEqual(await decide("logout", fetchSite, false, api.check), { clearCookie: false, location: "/login?notice=logout" });
    assert.equal(api.llamadas.n, 0);
  }
});

test("la ruta usa decideExpirada, borra solo si lo dice y pregunta a /auth/me con el tope de 15 s", () => {
  const ruta = sinComentarios(leer("../../app/auth/expirada/route.ts"));
  assert.match(ruta, /fetchSite: request\.headers\.get\("sec-fetch-site"\)/);
  assert.match(ruta, /check: \(\) => checkSessionToken\(/);
  assert.match(ruta, /if \(clearCookie\) response\.cookies\.delete\(SESSION_COOKIE\)/);
  assert.equal(ruta.match(/cookies\.delete/g).length, 1);
  // Location relativo (#49, RC-91): ni request.url ni nextUrl en la dirección.
  assert.match(ruta, /headers: \{ Location: location \}/);
  const servidor = sinComentarios(leer("./server.ts"));
  const desde = servidor.indexOf("export function checkSessionToken");
  assert.ok(desde > 0);
  assert.match(servidor.slice(desde), /\/api\/v1\/auth\/me[\s\S]*signal: withTimeout\(\)/);
});
