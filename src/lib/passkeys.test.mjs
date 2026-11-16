// Pruebas sin red de las passkeys del portal (RC-331). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as passkeys from "./passkeys.ts";
import {
  ceremonyErrorMessage,
  cleanPasskeyName,
  isCeremonyAborted,
  PASSKEYS_CHANGED,
  passwordChangedMessage,
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

test("5. el correo del login ofrece solo contraseñas y la passkey va con el botón", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  // Sin autollenado de passkeys: en el correo no se encima con el menú del gestor de contraseñas (16 nov).
  assert.match(form, /autoComplete="username"/);
  assert.doesNotMatch(form, /webauthn"/);
  assert.doesNotMatch(form, /useBrowserAutofill/);
  assert.doesNotMatch(form, /browserSupportsWebAuthnAutofill/);
  assert.match(form, /Entrar con passkey/);
  // Al salir de la página se cancela la ceremonia que el botón haya dejado abierta.
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

test("8. el login pide el reto de la passkey solo al dar clic en el botón", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  assert.equal(form.match(/passkeyLoginOptions\(/g)?.length, 1);
  assert.equal(form.match(/enterWithPasskey\(/g)?.length, 1);
  assert.match(form, /const enterWithPasskey = async \(\) => \{\s+const \{ options, login_token \} = await passkeyLoginOptions\(\);/);
  assert.match(form, /onClick=\{onPasskey\}/);
});

test("9. las ayudas ya no traen el autollenado", () => {
  for (const nombre of ["MAX_AUTOFILL_RETRIES", "canRearmAutofill", "autofillRefreshMs"]) {
    assert.equal(nombre in passkeys, false, nombre);
  }
});

test("10. tras gastar el código, la falla pide esperar el siguiente", () => {
  assert.match(withNextCodeHint("Se canceló la passkey o se agotó el tiempo."), /agotó el tiempo\. Para intentarlo otra vez, espera el siguiente código/);
  // R7 de RC-331: con el mensaje real del navegador no queda 'Inténtalo de nuevo.' antes de la pista.
  const cancelada = withNextCodeHint(ceremonyErrorMessage({ name: "NotAllowedError" }));
  assert.equal(cancelada, "Se canceló la passkey o se agotó el tiempo. Para intentarlo otra vez, espera el siguiente código de tu app.");
  assert.doesNotMatch(withNextCodeHint("No se pudo registrar la passkey. Inténtalo de nuevo."), /Inténtalo de nuevo/);
  assert.match(withNextCodeHint(null), /^Se canceló la passkey\. Para intentarlo/);
});

test("11. el login frena un segundo clic del botón de passkey", () => {
  const form = leer("../components/auth/forms/LoginForm.tsx");
  assert.match(form, /if \(buttonActive\.current\) return;\s+buttonActive\.current = true;/);
  // Tras cada intento el botón se suelta, haya salido bien o no.
  assert.match(form, /finally \{\s+buttonActive\.current = false;/);
  const mfa = leer("../components/screens/perfil/MfaSetup.tsx");
  assert.match(mfa, /passkeys_removed/);
});

test("12. cambiar la contraseña avisa las passkeys borradas y pone al día la lista (T1)", () => {
  assert.equal(PASSKEYS_CHANGED, "lowtide:passkeys-changed");
  assert.equal(passwordChangedMessage(0), "Tu contraseña se actualizó.");
  assert.match(passwordChangedMessage(1), /Se borró tu passkey: puedes registrar otra con la contraseña nueva\.$/);
  assert.match(passwordChangedMessage(3), /Se borraron tus 3 passkeys:/);
  const form = leer("../components/screens/perfil/ChangePasswordForm.tsx");
  assert.match(form, /passwordChangedMessage\(passkeys_removed\)/);
  assert.match(form, /dispatchEvent\(new Event\(PASSKEYS_CHANGED\)\)/);
  const lista = leer("../components/screens/perfil/PasskeysSection.tsx");
  assert.match(lista, /addEventListener\(PASSKEYS_CHANGED, refresh\)/);
  assert.match(lista, /removeEventListener\(PASSKEYS_CHANGED, refresh\)/);
});
