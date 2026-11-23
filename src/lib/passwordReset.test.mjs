// Pruebas sin red de recuperar la contraseña con un enlace al correo (RC-335). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. el servicio llama a las rutas de la API con el captcha y el token, sin código de 4 dígitos", () => {
  const svc = leer("../services/authService.ts");
  assert.match(svc, /apiClient\.post<PasswordResetRequestResponse>\("\/auth\/password-reset", payload\)/);
  assert.match(svc, /apiClient\.post<PasswordResetConfirmResponse>\("\/auth\/password-reset\/confirm", payload\)/);
  assert.ok(!svc.includes("verifyResetCode"), "ya no hay código de verificación");
  assert.ok(!svc.includes("reset_disabled"), "la recuperación ya tiene backend");
  const tipos = leer("../types/auth.ts");
  assert.match(tipos, /interface PasswordResetRequest \{\s*email: string;\s*captcha: string;\s*\}/);
  assert.match(tipos, /interface PasswordResetConfirmRequest \{\s*token: string;\s*new_password: string;\s*\}/);
  assert.ok(!tipos.includes("reset_token"));
});

test("2. pedir el enlace lleva captcha y muestra el texto de la API tal cual", () => {
  const form = leer("../components/auth/forms/ForgotPasswordForm.tsx");
  assert.match(form, /<Captcha renew=\{attempts\} onChange=\{onCaptcha\} \/>/);
  assert.match(form, /requestPasswordReset\(\{ email, captcha \}\)/);
  assert.match(form, /writeFlow\("reset", \{ email, detail \}\)/);
  assert.match(form, /setCaptcha\(null\);\s*setAttempts/, "cada intento gasta su captcha");
  const enviado = leer("../components/auth/forms/ResetEmailSent.tsx");
  assert.match(enviado, /<Notice>\{data\.detail\}<\/Notice>/);
  assert.ok(!/CodeInput|dígitos/.test(enviado), "el paso del código pasó a «Revisa tu correo»");
  assert.ok(!existsSync(new URL("../components/auth/forms/VerifyResetCodeForm.tsx", import.meta.url)));
  const verify = leer("../app/(auth)/forgot-password/verify/page.tsx");
  assert.match(verify, /<ResetEmailSent \/>/);
});

test("3. el token sale del fragmento, se quita de la barra y del historial y solo se gasta al guardar", () => {
  const form = leer("../components/auth/forms/ResetPasswordForm.tsx");
  assert.match(form, /const hash = window\.location\.hash;/);
  assert.match(form, /tokenFromHash\(hash\)/);
  assert.match(form, /history\.replaceState\(null, "", window\.location\.pathname\)/);
  assert.ok(!form.includes("useEffect"), "abrir la página no debe gastar el token: el revisor de enlaces la abre");
  assert.equal(form.match(/resetPassword\(/g).length, 1);
  assert.ok(form.indexOf("resetPassword({ token, new_password: password })") > form.indexOf("const onSubmit"));
  assert.ok(!/sessionStorage|localStorage|writeFlow/.test(form), "el token no se guarda en ningún lado");
  assert.ok(form.indexOf("forgetResetToken();") > form.indexOf("const onSubmit") &&
    form.indexOf("forgetResetToken();") < form.indexOf("await resetPassword"), "tras un rechazo no se reintenta con el mismo token");
  assert.match(form, /addEventListener\("hashchange", onChange\)/, "otro enlace pegado en la misma pestaña se toma");
  assert.match(form, /removeEventListener\("hashchange", onChange\)/);
  assert.match(form, /useSyncExternalStore\(subscribeHash, readResetToken/);
  assert.match(form, /href="\/forgot-password"/, "ofrece pedir otro enlace");
});

test("4. la página del enlace no manda Referer y el login avisa del cambio", () => {
  const page = leer("../app/(auth)/forgot-password/reset/page.tsx");
  assert.match(page, /referrer: "no-referrer"/);
  assert.match(page, /<ResetPasswordForm \/>/);
  const login = leer("../app/(auth)/login/page.tsx");
  assert.match(login, /reset: "Tu contraseña se actualizó/);
  assert.match(login, /reset_passkeys: "/);
  const flow = leer("./flowStorage.ts");
  assert.match(flow, /reset: \{ email: string; detail: string \}/);
});
