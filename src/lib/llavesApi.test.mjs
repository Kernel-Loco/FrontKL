// HX7, HX19 y RC-129: Acceso API crea, lista y revoca llaves en la API real (BackKL cirdan/api/llaves.py).
// node --test, sin red. Node 22.18 o más nuevo: llavesApi.ts solo importa tipos y se importa directo.
// Los servicios y la pantalla usan alias @/ y se leen como texto, como en platform.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  API_KEY_MAX_DAYS,
  API_KEY_NAME_MAX,
  API_KEY_OWN_USE_ERROR,
  conRevocadasLocales,
  contarActivas,
  cuerpoDeLlave,
  estadoVisible,
  largoDelNombre,
  marcarRevocada,
  puedeRevocar,
  validarLlave,
} from "./llavesApi.ts";

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
  const antesDeVencer = Date.parse("2026-11-16T00:00:00Z");
  assert.equal(contarActivas([fila(), revocada, fila({ status: "expired" })], antesDeVencer), 1);
});

test("6. el nombre se mide en caracteres, como len() de Python en el max_length de LlaveIn", () => {
  const conEmoji = `SIEM ${"\u{1F511}".repeat(40)}`;
  assert.equal(largoDelNombre(conEmoji), 45);
  assert.equal(conEmoji.length, 85);
  assert.equal(validarLlave(pedido({ name: conEmoji })), null);
  assert.match(validarLlave(pedido({ name: "\u{1F511}".repeat(API_KEY_NAME_MAX + 1) })), /80/);
  assert.doesNotMatch(leer("../components/screens/admin/ApiKeysManager.tsx"), /maxLength=/);
});

test("7. una llave que vence con la página abierta se ve y se cuenta como vencida", () => {
  const llave = fila({ expires_at: "2026-11-16T10:05:00Z" });
  const antes = Date.parse("2026-11-16T10:00:00Z");
  const despues = Date.parse("2026-11-16T10:30:00Z");
  assert.equal(estadoVisible(llave, antes), "active");
  assert.equal(estadoVisible(llave, despues), "expired");
  assert.equal(estadoVisible(llave, Date.parse(llave.expires_at)), "expired");
  assert.equal(estadoVisible(fila({ status: "revoked", revoked_at: "2026-11-02T00:00:00Z" }), despues), "revoked");
  assert.equal(contarActivas([llave], antes), 1);
  assert.equal(contarActivas([llave], despues), 0);
  const pantalla = leer("../components/screens/admin/ApiKeysManager.tsx");
  assert.match(pantalla, /const estado = estadoVisible\(k, ahora\)/);
  assert.match(pantalla, /revocable &&/);
  assert.match(pantalla, /contarActivas\(keys, ahora\)/);
  assert.match(pantalla, /setInterval\(tick, RELOJ_MS\)/);
});

test("8. revocar la llave del aviso lo quita, refresca la ruta y cada revocación lleva su id y su error", () => {
  const pantalla = leer("../components/screens/admin/ApiKeysManager.tsx");
  assert.match(pantalla, /setSecret\(\(current\) => \(current\?\.id === id \? null : current\)\)/);
  assert.equal(pantalla.match(/router\.refresh\(\);/g)?.length, 2);
  assert.match(pantalla, /quedan\.delete\(id\)/);
  assert.match(pantalla, /setConfirmId\(\(current\) => \(current === id \? null : current\)\)/);
  assert.doesNotMatch(pantalla, /revokingId|setRevokingId\(null\)|setConfirmId\(null\);\r?\n\s*\}/);
  assert.doesNotMatch(pantalla, /\bsetError\(/);
  assert.match(pantalla, /setRevokeErrors\(\(current\) => \(\{ \.\.\.current, \[id\]: getErrorMessage\(err\) \}\)\)/);
  assert.match(pantalla, /setCopyError\("No se pudo copiar/);
});

test("9. si GET /domains falla, Acceso API sigue con la lista y la revocación", () => {
  const pagina = leer("../app/(dashboard)/dashboard/admin/api/page.tsx");
  assert.doesNotMatch(pagina, /Promise\.all\(\[getApiKeys\(\), getDomains\(\)\]\)/);
  assert.match(pagina, /getDomains\(\)\.catch\(\(error: unknown\) => \{\s*if \(error instanceof ServiceError\) return null;\s*throw error;/);
  assert.match(leer("../components/screens/admin/ApiKeysManager.tsx"), /domains === null &&/);
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
  assert.match(pantalla, /setSecret\(\{ id: created\.id, name: created\.name, value: created\.key \}\)/);
  assert.match(pantalla, /setKeys\(\(current\) => \[sinLlave\(created\), \.\.\.current\]\)/);
  const alCrear = pantalla.slice(pantalla.indexOf("const onCreate"), pantalla.indexOf("const onRevoke"));
  assert.doesNotMatch(alCrear, /setSecret\(null\)/);
  assert.match(pantalla, /getErrorMessage\(err, \{ apiMessageOn403: true \}\)/);
  assert.match(pantalla, /name="domain"/);
});

test("10. la llave del aviso no se pierde por un refresco, la lista vieja no deshace una revocación y Revocar no depende del reloj", () => {
  const pantalla = leer("../components/screens/admin/ApiKeysManager.tsx");
  // Regresión 1: crear no refresca. Revocar otra llave con el aviso a la vista tampoco: se refresca al cerrarlo.
  const alCrear = pantalla.slice(pantalla.indexOf("const onCreate"), pantalla.indexOf("const onRevoke"));
  assert.doesNotMatch(alCrear, /router\.refresh\(\)/);
  assert.match(pantalla, /if \(!aviso \|\| aviso\.id === id\) router\.refresh\(\);/);
  const alCerrar = pantalla.slice(pantalla.indexOf("const cerrarAviso"));
  assert.match(alCerrar.slice(0, alCerrar.indexOf("};")), /setSecret\(null\);[\s\S]*router\.refresh\(\);/);
  assert.match(pantalla, /onClick=\{cerrarAviso\}/);

  // Regresión 2: una lista pedida antes del DELETE trae la llave activa y se queda revocada.
  const revocadaEn = "2026-11-16T10:00:00Z";
  const otra = fila({ id: "c0000000-0000-4000-8000-000000000002" });
  const lista = conRevocadasLocales([fila(), otra], new Map([[fila().id, revocadaEn]]));
  assert.equal(lista[0].status, "revoked");
  assert.equal(lista[0].revoked_at, revocadaEn);
  assert.equal(lista[1], otra);
  const yaRevocada = fila({ status: "revoked", revoked_at: "2026-11-02T00:00:00Z" });
  assert.equal(conRevocadasLocales([yaRevocada], new Map([[yaRevocada.id, revocadaEn]]))[0], yaRevocada);
  assert.match(pantalla, /setKeys\(conRevocadasLocales\(initial, revocadas\)\)/);

  // Regresión 3: con el reloj adelantado se ve 'Vencida', pero Revocar sigue el status de la API.
  const vigente = fila({ expires_at: "2026-11-16T10:05:00Z" });
  const relojAdelantado = Date.parse("2026-11-17T00:00:00Z");
  assert.equal(estadoVisible(vigente, relojAdelantado), "expired");
  assert.equal(puedeRevocar(vigente), true);
  assert.equal(puedeRevocar(marcarRevocada(vigente, revocadaEn)), false);
  assert.equal(puedeRevocar(fila({ status: "expired" })), false);

  // Regresión 4: el error de un DELETE solo se ve mientras la fila sigue revocable.
  assert.match(pantalla, /const revokeError = revocable \? revokeErrors\[k\.id\] : undefined;/);
});
