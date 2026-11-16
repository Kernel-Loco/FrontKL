// Pruebas sin red de las passkeys del portal (RC-331). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  autofillRefreshMs,
  canRearmAutofill,
  ceremonyErrorMessage,
  cleanPasskeyName,
  isCeremonyAborted,
  MAX_AUTOFILL_RETRIES,
  registrationMustRestart,
  withNextCodeHint,
} from "./passkeys.ts";

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

test("8. el autollenado solo se vuelve a armar tras la API o una cancelación, con tope", () => {
  const api = new Error("La passkey no es válida.");
  const cancel = { name: "NotAllowedError", code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" };
  assert.equal(canRearmAutofill(api, 0), true);
  assert.equal(canRearmAutofill(cancel, 0), true);
  assert.equal(canRearmAutofill({ name: "SecurityError", code: "ERROR_INVALID_RP_ID" }, 0), false);
  assert.equal(canRearmAutofill({ name: "NotSupportedError" }, 0), false);
  assert.equal(canRearmAutofill(api, MAX_AUTOFILL_RETRIES), false);
  assert.equal(canRearmAutofill(cancel, MAX_AUTOFILL_RETRIES - 1), true);
});

test("9. el reto del autollenado se renueva antes de vencer", () => {
  assert.equal(autofillRefreshMs(300), 285_000);
  assert.equal(autofillRefreshMs(20), 30_000);
});

test("10. tras gastar el código, la falla pide esperar el siguiente", () => {
  assert.match(withNextCodeHint("Se canceló la passkey o se agotó el tiempo."), /agotó el tiempo\. Para intentarlo otra vez, espera el siguiente código/);
  // R7 de RC-331: con el mensaje real del navegador no queda 'Inténtalo de nuevo.' antes de la pista.
  const cancelada = withNextCodeHint(ceremonyErrorMessage({ name: "NotAllowedError" }));
  assert.equal(cancelada, "Se canceló la passkey o se agotó el tiempo. Para intentarlo otra vez, espera el siguiente código de tu app.");
  assert.doesNotMatch(withNextCodeHint("No se pudo registrar la passkey. Inténtalo de nuevo."), /Inténtalo de nuevo/);
  assert.match(withNextCodeHint(null), /^Se canceló la passkey\. Para intentarlo/);
});

test("11. el login no deja que el autollenado corte el botón y renueva el reto", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  assert.match(form, /buttonActive\.current\) return/);
  assert.match(form, /canRearmAutofill\(error, autofillRetries\.current\)/);
  assert.match(form, /autofillRefreshMs\(options\.expires_in_seconds\)/);
  const mfa = leer("../components/screens/perfil/MfaSetup.tsx");
  assert.match(mfa, /passkeys_removed/);
});
