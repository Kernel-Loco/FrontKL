// Pruebas sin red de los textos del portal (#209, RC-328). Node 22.18 o más nuevo:
//   node --test src/lib/textos.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const SRC = join(import.meta.dirname, "..");
const leer = (r) => readFileSync(join(SRC, r), "utf8");

function archivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

function buscar(patron) {
  return archivos(SRC).flatMap((ruta) =>
    readFileSync(ruta, "utf8")
      .split("\n")
      .flatMap((linea, i) => (patron.test(linea) ? [`${ruta}:${i + 1}`] : [])),
  );
}

test("ningún texto dice 'Reset password', 'e-mail' ni 'hallazgo(s)'", () => {
  assert.deepEqual(buscar(/Reset password|e-mail|hallazgo\(s\)|dominio\(s\)/), []);
});

test("los textos para el usuario dicen Administrador, no Admin", () => {
  // Los comentarios del código pueden decir Admin: solo cuentan las líneas que no son comentario.
  assert.deepEqual(buscar(/^(?!\s*(\/\/|\/?\*)).*(un Admin\b|Solo Admin\b)/), []);
});

test("la banda Bajo de Pesos usa el mismo color que el resto del portal", () => {
  assert.match(leer("components/screens/admin/ScoringWeightsView.tsx"), /<Badge tone=\{BAND_TONE\[b\.band\]\}>/);
});

test("'Ver hallazgos' del plan solo sale a los roles que entran a Hallazgos", () => {
  assert.match(leer("components/screens/plan/ActionPlanExplorer.tsx"), /\{canOpenFindings && \(\s*<Link/);
  assert.match(leer("app/(dashboard)/dashboard/plan/page.tsx"), /canOpenFindings=\{canAccessSection\(user\.role, "hallazgos"\)\}/);
});

test("el gráfico del Dashboard no dice 'riesgo sin calcular'", () => {
  // En Detalle y Hallazgos sí aplica: ahí es un dominio autorizado que aún no tiene score.
  assert.doesNotMatch(leer("components/screens/dashboard/FindingsByTypeChart.tsx"), /[Rr]iesgo sin calcular/);
});

test("Usuarios e Integraciones no prometen correo ni evento mientras son simulados", () => {
  assert.match(leer("components/screens/admin/UsersManager.tsx"), /esSimulada\("inviteUser"\) \? "Simulado: todavía no se envía ningún correo\."/);
  assert.match(leer("components/screens/admin/IntegrationsManager.tsx"), /esSimulada\("createIntegration"\) \? `Simulado\. .*sin evento de prueba\.`/);
});

test("el tope de 8 h tiene su propio aviso en el login", () => {
  assert.match(leer("components/IdleTimeout.tsx"), /reason === "absolute" \? "\/login\?notice=max" : "\/login\?notice=expired"/);
  assert.match(leer("app/(auth)/login/page.tsx"), /max: "Tu sesión llegó a su duración máxima de 8 horas\./);
});
