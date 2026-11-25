// Pruebas sin red de la salida del portal con la API caída (revisión de riesgo del 15 nov, #0, #1 y #2 de RC-225).
//   npm test
// Antes, cerrar sesión iba a /login con router.replace: si POST /auth/logout fallaba, la cookie seguía y proxy.ts
// devolvía a /dashboard. Con user null tampoco había botón para salir, y navegar desde el menú no pintaba la página.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LOGIN_NOTICES, leaveSession, loginNoticeFrom, signOutPath } from "./logout.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const sinComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Texto del bloque que abre `inicio` hasta su paréntesis de cierre. */
function bloque(codigo, inicio) {
  const desde = codigo.indexOf(inicio);
  assert.notEqual(desde, -1, `no está ${inicio}`);
  let abiertos = 0;
  for (let i = desde + inicio.length - 1; i < codigo.length; i += 1) {
    if (codigo[i] === "(") abiertos += 1;
    if (codigo[i] === ")") abiertos -= 1;
    if (abiertos === 0) return codigo.slice(desde, i + 1);
  }
  assert.fail(`sin cierre: ${inicio}`);
}

test("la salida pasa por la ruta que borra la cookie, con el aviso pedido", () => {
  const destinos = [];
  for (const notice of LOGIN_NOTICES) leaveSession(notice, { replace: (url) => destinos.push(url) });
  assert.deepEqual(destinos, LOGIN_NOTICES.map((notice) => `/auth/expirada?notice=${notice}`));
  assert.equal(signOutPath("logout"), "/auth/expirada?notice=logout");
});

test("/auth/expirada solo acepta avisos conocidos y sin aviso sigue en 'ended'", () => {
  for (const notice of LOGIN_NOTICES) assert.equal(loginNoticeFrom(notice), notice);
  for (const otro of [null, undefined, "", "registered", "https://otro.sitio", "logout&x=1"]) {
    assert.equal(loginNoticeFrom(otro), "ended", String(otro));
  }
  const ruta = sinComentarios(leer("../../app/auth/expirada/route.ts"));
  assert.match(ruta, /const requested = new URL\(request\.url\)\.searchParams\.get\("notice"\)/);
  assert.match(ruta, /notice: loginNoticeFrom\(requested\)/);
  // A dónde va y si borra la cookie lo decide decideExpirada (RC-301, expirada.test.mjs).
  assert.match(sinComentarios(leer("./expirada.ts")), /const toLogin = `\/login\?notice=\$\{input\.notice\}`/);
});

test("cerrar sesión y el cierre por inactividad no vuelven a /login con el router", () => {
  for (const archivo of ["../../components/Sidebar.tsx", "../../components/IdleTimeout.tsx"]) {
    const codigo = sinComentarios(leer(archivo));
    assert.doesNotMatch(codigo, /router\.(replace|push)\(/, archivo);
    assert.match(codigo, /await logout\(\);\s*leaveSession\(/, archivo);
  }
});

test("con user null el menú sigue ofreciendo Cerrar sesión", () => {
  const codigo = sinComentarios(leer("../../components/Sidebar.tsx"));
  assert.match(codigo, /onClick=\{handleLogout\}/);
  assert.doesNotMatch(bloque(codigo, "{user && ("), /handleLogout|Cerrar sesión/);
});

test("el aviso de servicio caído vuelve a pedir la ruta al navegar desde el menú", () => {
  const codigo = sinComentarios(leer("../../components/dashboard/ServiceUnavailable.tsx"));
  const efecto = bloque(codigo, "useEffect(");
  assert.match(efecto, /router\.refresh\(\)/);
  assert.match(efecto, /\[pathname, router\]/);
  assert.match(codigo, /const pathname = usePathname\(\)/);
});
