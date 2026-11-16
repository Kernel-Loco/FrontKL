// Pruebas sin red del selector de empresa del superadmin (RC-332). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ORGANIZATION_CHANNEL,
  canWorkIn,
  organizationOptionLabel,
  refreshListAfterFailedSwitch,
  reloadAfterFailedSwitch,
  sortOrganizations,
  switchErrorMessage,
} from "./platform.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const org = (id, name, extra = {}) => ({ id, name, status: "active", active: false, home: false, ...extra });

test("1. la empresa propia va primero y luego por nombre sin acentos ni mayúsculas", () => {
  const lista = [org("3", "Ética SA"), org("1", "LowTide", { home: true }), org("2", "acme"), org("4", "Grupo Olmardo")];
  assert.deepEqual(sortOrganizations(lista).map((o) => o.name), ["LowTide", "acme", "Ética SA", "Grupo Olmardo"]);
  assert.deepEqual(lista.map((o) => o.id), ["3", "1", "2", "4"], "no cambia la lista original");
});

test("2. solo se trabaja en empresas en prueba o activas, como la API", () => {
  assert.equal(canWorkIn(org("1", "A", { status: "trial" })), true);
  assert.equal(canWorkIn(org("1", "A", { status: "active" })), true);
  assert.equal(canWorkIn(org("1", "A", { status: "suspended" })), false);
  assert.equal(canWorkIn(org("1", "A", { status: "cancelled" })), false);
});

test("3. cada opción dice si es la propia o su estado", () => {
  assert.equal(organizationOptionLabel(org("1", "LowTide", { home: true })), "LowTide (tu empresa)");
  assert.equal(organizationOptionLabel(org("2", "Grupo Olmardo")), "Grupo Olmardo");
  assert.equal(organizationOptionLabel(org("3", "Beta", { status: "suspended" })), "Beta (suspendida)");
  assert.equal(organizationOptionLabel(org("4", "Nueva", { status: "trial", home: true })), "Nueva (tu empresa, prueba)");
});

test("4. los errores del cambio tienen su mensaje", () => {
  assert.match(switchErrorMessage(403, "Solo el superadmin"), /ya no tiene permiso de superadmin/);
  assert.match(switchErrorMessage(404, "Organización no encontrada"), /ya no existe/);
  assert.equal(switchErrorMessage(409, "La organización está suspendida."), "La organización está suspendida.");
  assert.match(switchErrorMessage(409, ""), /suspendida o cancelada/);
  assert.match(switchErrorMessage(undefined, undefined), /No pudimos cambiar de empresa/);
});

test("5. el servicio llama a las dos rutas de la API con el cuerpo que espera", () => {
  const servicio = leer("../services/platformService.ts");
  assert.match(servicio, /apiClient\.get<PlatformOrganizationList>\("\/platform\/organizations"/);
  assert.match(servicio, /apiClient\.post<PlatformSwitchResult>\("\/platform\/organization", \{ organization_id \}\)/);
});

test("6. la barra muestra el selector solo al superadmin y recarga /dashboard tras cambiar", () => {
  const barra = leer("../components/Sidebar.tsx");
  assert.match(barra, /user && canSwitchOrganization\(user\) \? \(\s*<OrganizationSwitcher user=\{user\} \/>/);
  const permisos = leer("../config/permissions.ts");
  assert.match(permisos, /return user\?\.platform_admin === true;/);
  const selector = leer("../components/OrganizationSwitcher.tsx");
  assert.match(selector, /await switchOrganization\(id\);\s*announceSwitch\(\);\s*reloadDashboard\(\);/);
  assert.match(selector, /function reloadDashboard\(\) \{[\s\S]{0,200}?window\.location\.assign\("\/dashboard"\);/);
  assert.match(selector, /disabled=\{!canWorkIn\(o\) && o\.id !== active\}/);
  assert.match(selector, /role="alert"/);
  assert.match(selector, /htmlFor=\{selectId\}[^>]*>\s*Empresa activa/);
});

test("7. tras un error sin respuesta clara recarga, y tras 404 o 409 vuelve a pedir la lista", () => {
  for (const status of [undefined, 0, 500, 502, 504]) assert.equal(reloadAfterFailedSwitch(status), true, String(status));
  for (const status of [401, 403, 404, 409]) assert.equal(reloadAfterFailedSwitch(status), false, String(status));
  assert.equal(refreshListAfterFailedSwitch(404), true);
  assert.equal(refreshListAfterFailedSwitch(409), true);
  assert.equal(refreshListAfterFailedSwitch(403), false);
  assert.equal(refreshListAfterFailedSwitch(500), false);
  const selector = leer("../components/OrganizationSwitcher.tsx");
  assert.match(selector, /if \(reloadAfterFailedSwitch\(status\)\) \{[\s\S]{0,200}?announceSwitch\(\);\s*reloadDashboard\(\);/);
  assert.match(selector, /if \(refreshListAfterFailedSwitch\(status\)\) load\(\);/);
  assert.match(selector, /onFocus=\{\(\) => \{\s*if \(orgs && !switching\) load\(\);/);
});

test("8. las demás pestañas recargan cuando una cambia de empresa", () => {
  const selector = leer("../components/OrganizationSwitcher.tsx");
  assert.equal(ORGANIZATION_CHANNEL, "lowtide-empresa-activa");
  assert.match(selector, /new BroadcastChannel\(ORGANIZATION_CHANNEL\);\s*channel\.postMessage\("switched"\);/);
  assert.match(selector, /channel\.onmessage = \(\) => reloadDashboard\(\);/);
});
