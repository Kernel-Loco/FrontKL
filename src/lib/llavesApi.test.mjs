// HX7, HX19 y RC-129: Acceso API crea, lista y revoca llaves en la API real (BackKL cirdan/api/llaves.py).
// node --test, sin red. Node 22.18 o más nuevo: llavesApi.ts solo importa tipos y se importa directo.
// Los servicios y la pantalla usan alias @/ y se leen como texto, como en platform.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { API_KEY_MAX_DAYS, API_KEY_NAME_MAX, API_KEY_OWN_USE_ERROR, contarActivas, cuerpoDeLlave, marcarRevocada, validarLlave } from "./llavesApi.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const pedido = (cambios = {}) => ({ name: "SIEM corporativo", expires_in_days: 30, own_use: true, ...cambios });
const fila = (cambios = {}) => ({
  id: "c0000000-0000-4000-8000-000000000001",
  name: "SIEM",
  key_prefix: "CIRDAN_FAKE_7f3a",
  domain: null,
  scopes: ["read"],
  created_by: "alex.morgan@acme-demo.mx",
  created_at: "2026-11-01T00:00:00Z",
  expires_at: "2026-12-01T00:00:00Z",
  last_used_at: null,
  revoked_at: null,
  status: "active",
  ...cambios,
});

test("1. el cuerpo de POST es el de LlaveIn: sin scopes, nombre recortado, dominio solo si hay", () => {
  assert.deepEqual(cuerpoDeLlave(pedido({ name: "  SIEM  ", domain: "" })), { name: "SIEM", expires_in_days: 30, own_use: true });
  assert.deepEqual(cuerpoDeLlave(pedido({ domain: " olmardo.com " })), {
    name: "SIEM corporativo",
    domain: "olmardo.com",
    expires_in_days: 30,
    own_use: true,
  });
  assert.equal("scopes" in cuerpoDeLlave(pedido({ scopes: ["scans:write"] })), false);
});

test("2. valida lo mismo que el backend antes de llamarlo", () => {
  assert.equal(validarLlave(pedido()), null);
  assert.equal(validarLlave(pedido({ own_use: false })), API_KEY_OWN_USE_ERROR);
  assert.match(validarLlave(pedido({ name: "   " })), /nombre/);
  assert.equal(validarLlave(pedido({ name: "x".repeat(API_KEY_NAME_MAX) })), null);
  assert.match(validarLlave(pedido({ name: "x".repeat(API_KEY_NAME_MAX + 1) })), /80/);
  assert.match(validarLlave(pedido({ name: "SIEM\u0007" })), /control/);
  assert.match(validarLlave(pedido({ name: "SIEM\u007f" })), /control/);
  for (const dias of [0, API_KEY_MAX_DAYS + 1, 1.5, Number.NaN]) {
    assert.match(validarLlave(pedido({ expires_in_days: dias })), /vigencia/, `días ${dias}`);
  }
  assert.equal(validarLlave(pedido({ expires_in_days: 1 })), null);
  assert.equal(validarLlave(pedido({ expires_in_days: API_KEY_MAX_DAYS })), null);
});

test("3. revocar marca la fila sin cambiar la fecha si ya estaba revocada, y solo cuenta las activas", () => {
  const revocada = marcarRevocada(fila(), "2026-11-16T10:00:00Z");
  assert.equal(revocada.revoked_at, "2026-11-16T10:00:00Z");
  assert.equal(revocada.status, "revoked");
  const vieja = fila({ revoked_at: "2026-11-02T00:00:00Z", status: "revoked" });
  assert.equal(marcarRevocada(vieja, "2026-11-16T10:00:00Z"), vieja);
  assert.equal(contarActivas([fila(), revocada, fila({ status: "expired" })]), 1);
});

test("4. el servicio llama a /api-keys de la API y ya no simula", () => {
  const servicio = leer("../services/adminService.ts");
  assert.match(servicio, /apiClient\.post<ApiKeyCreated>\("\/api-keys", cuerpoDeLlave\(request\)\)/);
  assert.match(servicio, /apiClient\.delete<void>\(`\/api-keys\/\$\{encodeURIComponent\(id\)\}`\)/);
  assert.doesNotMatch(servicio, /API_SCOPES|secret|api_key:|function getApiKeys|mockSettings.api_keys/);
  assert.match(leer("../services/queries.ts"), /export const getApiKeys = \(\) => apiGet<ListResponse<ApiKey>>\("\/api-keys"\)/);
  const simuladas = leer("../config/simulado.ts");
  for (const funcion of ["getApiKeys", "createApiKey", "revokeApiKey"]) assert.doesNotMatch(simuladas, new RegExp(`"${funcion}"`));
});

test("5. la pantalla muestra `key`, no la deja en la lista y no borra la llave si otro envío falla", () => {
  const pantalla = leer("../components/screens/admin/ApiKeysManager.tsx");
  assert.match(pantalla, /setSecret\(\{ name: created\.name, value: created\.key \}\)/);
  assert.match(pantalla, /setKeys\(\(current\) => \[sinLlave\(created\), \.\.\.current\]\)/);
  assert.doesNotMatch(pantalla, /setSecret\(null\)/);
  assert.match(pantalla, /getErrorMessage\(err, \{ apiMessageOn403: true \}\)/);
  assert.match(pantalla, /name="domain"/);
  assert.match(pantalla, /k\.status === "active"/);
});
