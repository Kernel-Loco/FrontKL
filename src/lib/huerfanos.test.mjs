// Huérfanos de la auditoría del 15 nov (HX21 a HX26, RC-308): lo que nada usaba ya no está. node --test, sin red.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const ruta = (r) => new URL(r, import.meta.url);
const leer = (r) => readFileSync(ruta(r), "utf8");

test("1. HX21: no hay /signup ni su entrada en proxy.ts", () => {
  assert.equal(existsSync(ruta("../app/(auth)/signup/page.tsx")), false);
  assert.equal(existsSync(ruta("../components/auth/forms/SignUpForm.tsx")), false);
  assert.doesNotMatch(leer("../proxy.ts"), /\/signup/);
  assert.doesNotMatch(leer("../services/authService.ts"), /signup_disabled|export async function register\b/);
});

test("2. HX13 y HX22: el login no enlaza a /forgot-password, que siempre falla sin backend", () => {
  assert.doesNotMatch(leer("../components/auth/forms/LoginForm.tsx"), /forgot-password/);
  assert.equal(existsSync(ruta("../app/(auth)/forgot-password/page.tsx")), true);
});

test("3. HX23, HX24 y HX25: getSettings, los seis simulados y SESSION_COOKIE_MAX_AGE_S ya no existen", () => {
  assert.doesNotMatch(leer("../services/settingsService.ts"), /getSettings/);
  assert.doesNotMatch(leer("../config/simulado.ts"), /"getSettings"/);
  const simulados = leer("../mocks/api/contrato.ts") + leer("../mocks/api/provisional.ts");
  for (const nombre of ["mockFindings", "mockFindingsByDomain", "mockExplanation", "mockAssets", "mockScans", "mockExplanationsExtra"]) {
    assert.doesNotMatch(simulados, new RegExp(`export const ${nombre}\\b`), nombre);
  }
  assert.doesNotMatch(leer("../config/session.ts"), /SESSION_COOKIE_MAX_AGE_S/);
});

test("4. HX26: el alta simulada busca duplicados en GET /domains, no en los dominios del contrato", () => {
  const servicio = leer("../services/domainService.ts");
  assert.doesNotMatch(servicio, /mockDomains/);
  assert.match(servicio, /apiClient\.get<ListResponse<Domain>>\("\/domains"\)/);
});
