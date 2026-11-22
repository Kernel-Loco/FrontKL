// Pruebas sin red del enlace para entrar por correo (#28, RC-63). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LOGIN_LINK_PATH, tokenFromHash } from "./loginLink.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const TOKEN = "Ab_-".repeat(10) + "xyz"; // 43 caracteres, como 32 bytes en base64 url-safe

test("1. el token sale solo del fragmento #t= y con la forma de un token", () => {
  assert.equal(tokenFromHash(`#t=${TOKEN}`), TOKEN);
  assert.equal(tokenFromHash(`t=${TOKEN}`), TOKEN);
  assert.equal(tokenFromHash(""), null);
  assert.equal(tokenFromHash(null), null);
  assert.equal(tokenFromHash("#x=abc"), null);
  assert.equal(tokenFromHash("#t=corto"), null);
  assert.equal(tokenFromHash(`#t=${"a".repeat(101)}`), null, "más largo de lo que acepta la API");
  assert.equal(tokenFromHash(`#t=${TOKEN}<script>`), null);
  assert.equal(LOGIN_LINK_PATH, "/login/enlace");
});

test("2. la página solo canjea al pulsar el botón y quita el token de la barra", () => {
  const form = leer("../components/auth/forms/LoginLinkForm.tsx");
  assert.ok(!form.includes("useEffect"), "abrir la página no debe canjear: el revisor de enlaces del correo la abre");
  assert.match(form, /onSubmit=\{onSubmit\}/);
  assert.equal(form.match(/redeemLoginLink\(/g).length, 1);
  assert.ok(form.indexOf("redeemLoginLink({ token })") > form.indexOf("const onSubmit"));
  assert.match(form, /history\.replaceState\(null, "", window\.location\.pathname\)/);
  assert.match(form, /writeFlow\("mfa", \{ mfa_token: result\.mfa_token \}\)/, "con MFA sigue al código");
  assert.match(form, /Entrar con contraseña o passkey/);
  const page = leer("../app/(auth)/login/enlace/page.tsx");
  assert.match(page, /<LoginLinkForm \/>/);
});

test("3. el login ofrece el enlace junto a la contraseña, sin esconderla, y muestra el texto de la API", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  assert.match(form, /autoComplete="current-password"/);
  assert.match(form, /Entrar con un enlace al correo/);
  assert.match(form, /requestLoginLink\(\{ email: getValues\("email"\), captcha \}\)/, "con el mismo captcha");
  assert.match(form, /setLinkNotice\(detail\)/, "el texto de la API, igual para todos (RC-327)");
  assert.match(form, /\{linkNotice && <Notice>\{linkNotice\}<\/Notice>\}/);
});

test("4. el servicio llama a las rutas de la API", () => {
  const servicio = leer("../services/authService.ts");
  assert.match(servicio, /apiClient\.post<LoginLinkRequestResponse>\("\/auth\/link\/request", payload\)/);
  assert.match(servicio, /apiClient\.post<LoginResponse>\("\/auth\/link\/verify", payload\)/);
});
