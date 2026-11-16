// Pruebas sin red de las passkeys del portal (RC-331). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ceremonyErrorMessage, cleanPasskeyName, isCeremonyAborted, registrationMustRestart } from "./passkeys.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. un aborto no es un error que se muestre", () => {
  assert.equal(isCeremonyAborted({ code: "ERROR_CEREMONY_ABORTED", name: "AbortError" }), true);
  assert.equal(isCeremonyAborted({ name: "AbortError" }), true);
  assert.equal(isCeremonyAborted({ name: "NotAllowedError" }), false);
  assert.equal(isCeremonyAborted(null), false);
});

test("2. las fallas del navegador tienen su mensaje y las de la API no", () => {
  assert.match(ceremonyErrorMessage({ name: "NotAllowedError", code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" }), /canceló/);
  assert.match(ceremonyErrorMessage({ name: "InvalidStateError", code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" }), /ya tiene/);
  assert.match(ceremonyErrorMessage({ name: "SecurityError", code: "ERROR_INVALID_RP_ID" }), /dirección oficial/);
  assert.match(ceremonyErrorMessage({ code: "ERROR_AUTHENTICATOR_GENERAL_ERROR" }), /no pudo/);
  assert.equal(ceremonyErrorMessage({ name: "ApiError" }), undefined);
  assert.equal(ceremonyErrorMessage("texto"), undefined);
});

test("3. el nombre se limpia y se corta a 60", () => {
  assert.equal(cleanPasskeyName("  Laptop   del\ttrabajo "), "Laptop del trabajo");
  assert.equal(cleanPasskeyName("x".repeat(80)).length, 60);
});

test("4. solo un reto vencido o gastado manda a empezar de nuevo", () => {
  assert.equal(registrationMustRestart(400, "La solicitud venció o ya se usó. Empieza de nuevo."), true);
  assert.equal(registrationMustRestart(400, "No se pudo registrar la passkey. Inténtalo de nuevo."), false);
  assert.equal(registrationMustRestart(409, "Esa passkey ya está registrada."), false);
});

test("5. el correo del login acepta el autollenado de passkeys y hay botón", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  assert.match(form, /autoComplete="username webauthn"/);
  assert.match(form, /useBrowserAutofill: true/);
  assert.match(form, /Entrar con passkey/);
  // Al salir de la página se cancela la ceremonia pendiente del autollenado.
  assert.match(form, /WebAuthnAbortService\.cancelCeremony\(\)/);
});

test("6. el perfil tiene la sección de passkeys y el registro pide contraseña", () => {
  const page = leer("../app/(dashboard)/dashboard/perfil/page.tsx");
  assert.match(page, /<PasskeysSection/);
  const section = leer("../components/screens/perfil/PasskeysSection.tsx");
  assert.match(section, /current_password/);
  assert.match(section, /startRegistration\(/);
  assert.match(section, /deletePasskey\(/);
});

test("7. las rutas de passkeys de la cuenta piden sesión y entrar con passkey no", () => {
  const client = leer("./apiClient.ts");
  assert.match(client, /startsWith\("\/auth\/passkeys\/login\/"\)\) return false/);
  assert.match(client, /path === "\/auth\/passkeys"/);
});
