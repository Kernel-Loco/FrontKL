// Pruebas sin red del alta de TOTP al entrar (RC-5). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { enrollMustRescan, enrollMustRestart, enrollTokenFrom, MFA_ENROLL_PATH } from "./mfaEnroll.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const TOKEN = "Ab_-".repeat(10) + "xyz"; // 43 caracteres, como secrets.token_urlsafe(32)

test("1. el token sale solo del 403 de /auth/login con mfa_setup_required", () => {
  const cuerpo = { detail: "Las cuentas de administrador deben activar...", mfa_setup_required: true, mfa_setup_token: TOKEN };
  assert.equal(enrollTokenFrom(403, cuerpo), TOKEN);
  assert.equal(enrollTokenFrom(401, cuerpo), null, "un 401 es contraseña, código o captcha");
  assert.equal(enrollTokenFrom(403, { detail: "No tienes permiso" }), null);
  assert.equal(enrollTokenFrom(403, { ...cuerpo, mfa_setup_required: "true" }), null);
  assert.equal(enrollTokenFrom(403, { ...cuerpo, mfa_setup_token: 42 }), null);
  assert.equal(enrollTokenFrom(403, { ...cuerpo, mfa_setup_token: "corto" }), null);
  assert.equal(enrollTokenFrom(403, { ...cuerpo, mfa_setup_token: "a".repeat(101) }), null);
  assert.equal(enrollTokenFrom(403, { ...cuerpo, mfa_setup_token: `${TOKEN}<script>` }), null);
  assert.equal(enrollTokenFrom(403, null), null);
  assert.equal(enrollTokenFrom(403, "texto"), null);
  assert.equal(MFA_ENROLL_PATH, "/login/mfa-alta");
});

test("2. QR vencido pide otro y token vencido vuelve a iniciar sesión", () => {
  const qr = "El código QR venció o ya se usaron sus 5 intentos. Empieza de nuevo.";
  const token = "Tu verificación expiró. Inicia sesión de nuevo.";
  const codigo = "El código no es válido o ya expiró.";
  assert.equal(enrollMustRescan(401, qr), true);
  assert.equal(enrollMustRescan(401, codigo), false, "un código malo se reintenta con el mismo QR");
  assert.equal(enrollMustRescan(429, qr), false);
  assert.equal(enrollMustRestart(401, token), true);
  assert.equal(enrollMustRestart(401, codigo), false);
  assert.equal(enrollMustRestart(401, qr), false);
});

test("3. el login manda el 403 con token a la pantalla del alta y la passkey muestra el detail del 403", () => {
  const login = leer("../components/auth/forms/LoginForm.tsx");
  assert.match(login, /enrollTokenFrom\(error\.status, error\.detail\)/);
  assert.match(login, /writeFlow\("mfaEnroll"/);
  assert.match(login, /router\.push\(MFA_ENROLL_PATH\)/);
  assert.match(login, /getErrorMessage\(error, \{ apiMessageOn403: true \}\)/);
  const alta = leer("../components/auth/forms/MfaEnrollForm.tsx");
  assert.match(alta, /startMfaEnroll\(\{ mfa_setup_token/);
  assert.match(alta, /enableMfaEnroll\(\{ mfa_setup_token/);
  assert.match(alta, /isQrDataUri/);
  assert.match(alta, /clearFlow\("mfaEnroll"\)/);
  const flujo = leer("./flowStorage.ts");
  assert.match(flujo, /mfaEnroll: \{ mfa_setup_token: string; detail: string \}/);
});
