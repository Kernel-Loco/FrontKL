// Pruebas sin red del captcha del login (RC-154). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CAPTCHA_CONFIG, CAPTCHA_MAX_LENGTH, CAPTCHA_STRINGS, CAPTCHA_URL, captchaPayload } from "./captcha.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const b64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString("base64");
const solucion = b64({ challenge: { parameters: { nonce: "ab" }, signature: "cd" }, solution: { counter: 1, derivedKey: "00" } });

test("1. solo se manda a /login una solución del widget", () => {
  assert.equal(captchaPayload(solucion), solucion);
  assert.equal(captchaPayload(b64({ challenge: null, solution: null, test: true })), null, "modo de prueba del widget");
  assert.equal(captchaPayload(""), null);
  assert.equal(captchaPayload(undefined), null);
  assert.equal(captchaPayload("no es base64!"), null);
  assert.equal(captchaPayload(b64([1, 2])), null);
  assert.equal(captchaPayload("A".repeat(CAPTCHA_MAX_LENGTH + 4)), null, "más largo de lo que acepta la API");
});

test("2. el widget pide el reto a la propia API y no recolecta la interacción", () => {
  assert.equal(CAPTCHA_URL, "/api/v1/auth/captcha");
  assert.deepEqual(CAPTCHA_CONFIG, { humanInteractionSignature: false });
  assert.ok(!("test" in CAPTCHA_CONFIG), "el modo test da por buena cualquier cosa");
  assert.equal(CAPTCHA_STRINGS.label, "No soy un robot");
});

test("3. el login manda el captcha, no envía sin él y pide otro después de cada intento", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  assert.match(form, /<Captcha renew=\{attempts\} onChange=\{onCaptcha\} \/>/);
  assert.match(form, /setCaptcha\(payload\);[\s\S]*?current === CAPTCHA_MISSING \? null : current/, "el aviso se quita al verificar");
  assert.match(form, /if \(!captcha\) \{[\s\S]*?return;/);
  assert.match(form, /login\(\{ \.\.\.values, captcha \}\)/);
  assert.match(form, /catch \(error\) \{[\s\S]*?setCaptcha\(null\);\s*setAttempts\(\(n\) => n \+ 1\);/);
  const widget = leer("../components/auth/Captcha.tsx");
  assert.doesNotMatch(widget, /\btest\b=|mockError/, "nunca en modo de prueba");
  assert.match(widget, /await import\("altcha"\)/, "el paquete se carga solo en el navegador");
});
