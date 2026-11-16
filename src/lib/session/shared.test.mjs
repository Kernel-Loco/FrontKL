// Pruebas sin red de toUser y los vencimientos de la sesión (#209, RC-328). Node 22.18 o más nuevo:
//   npm test
// BackKL manda idle_timeout_seconds y absolute_expires_in_seconds en /auth/me (rama rc-328-tiempos-de-sesion).
// Con los dos, IdleTimeout cuenta el tope de 8 h y da el aviso propio. Sin ellos, el tope queda en Infinity.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toUser } from "./shared.ts";

const base = {
  id: "u1",
  email: "ana@example.com",
  full_name: "Ana",
  role: "manager",
  organization_id: "o1",
  organization_name: "Org",
  mfa_enabled: true,
  last_login_at: null,
};

test("toUser arma session_limits con los dos campos de /auth/me", () => {
  const user = toUser({ ...base, idle_timeout_seconds: 900, absolute_expires_in_seconds: 28_000 });
  assert.deepEqual(user.session_limits, { idle_timeout_seconds: 900, absolute_expires_in_seconds: 28_000 });
  assert.equal(user.role, "gerente");
  assert.equal("organization_id" in user, false);
});

test("toUser acepta el tope absoluto en 0 (la sesión ya llegó a las 8 h)", () => {
  const user = toUser({ ...base, idle_timeout_seconds: 900, absolute_expires_in_seconds: 0 });
  assert.deepEqual(user.session_limits, { idle_timeout_seconds: 900, absolute_expires_in_seconds: 0 });
});

test("toUser sin los campos, o con alguno inválido, no inventa vencimientos", () => {
  assert.equal(toUser(base).session_limits, undefined);
  assert.equal(toUser({ ...base, idle_timeout_seconds: 900 }).session_limits, undefined);
  assert.equal(toUser({ ...base, absolute_expires_in_seconds: 100 }).session_limits, undefined);
  assert.equal(toUser({ ...base, idle_timeout_seconds: 0, absolute_expires_in_seconds: 100 }).session_limits, undefined);
});
