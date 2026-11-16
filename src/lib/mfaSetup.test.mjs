// Pruebas sin red del alta de TOTP del perfil (RC-154). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { groupSecret, isQrDataUri, minutesLeft, setupMustRestart } from "./mfaSetup.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. solo se muestra el QR que dibuja la API", () => {
  assert.equal(isQrDataUri("data:image/svg+xml;charset=utf-8,%3Csvg"), true);
  assert.equal(isQrDataUri("https://api.qrserver.com/v1/create-qr-code/?data=otpauth"), false);
  assert.equal(isQrDataUri("javascript:alert(1)"), false);
  assert.equal(isQrDataUri(undefined), false);
});

test("2. la clave manual va en grupos de 4", () => {
  assert.equal(groupSecret("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP");
  assert.equal(minutesLeft(600), 10);
  assert.equal(minutesLeft(5), 1);
});

test("3. un QR vencido o una cuenta ya activa vuelven al primer paso; un código malo no", () => {
  assert.equal(setupMustRestart(400, "El código QR venció o ya se usaron sus 5 intentos. Empieza de nuevo."), true);
  assert.equal(setupMustRestart(409, "La verificación en dos pasos ya está activa en tu cuenta."), true);
  assert.equal(setupMustRestart(400, "El código no es válido o ya expiró."), false);
});

test("4. el perfil sin MFA muestra el alta con QR y código, y con MFA no", () => {
  const pagina = leer("../app/(dashboard)/dashboard/perfil/page.tsx");
  assert.match(pagina, /!profile\.mfa_enabled && \(\s*<Card title="Activar la verificación en dos pasos">\s*<MfaSetup \/>/);
  const alta = leer("../components/screens/perfil/MfaSetup.tsx");
  assert.match(alta, /startMfaSetup\(\{ current_password: current \}\)/);
  assert.match(alta, /enableMfa\(\{ code \}\)/);
  assert.match(alta, /<CodeInput[^>]*length=\{6\}/);
  assert.match(alta, /isQrDataUri\(result\.qr_svg\)/);
  assert.match(alta, /max-w-\[216px\]/, "el QR cabe a 375 px");
});
