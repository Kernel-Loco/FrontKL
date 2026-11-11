// Pruebas sin red de los textos del portal (#209, RC-328). Node 22.18 o más nuevo:
//   node --test src/lib/textos.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { failedScanAt, lastScanAt } from "../components/screens/shared/domainState.ts";
import { cantidad } from "./format.ts";

const SRC = join(import.meta.dirname, "..");
const leer = (r) => readFileSync(join(SRC, r), "utf8");

function archivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

/** Líneas de src/ que cumplen `patron`, salvo las que también cumplen `excepto`. */
function buscar(patron, excepto) {
  return archivos(SRC).flatMap((ruta) =>
    readFileSync(ruta, "utf8")
      .split("\n")
      .flatMap((linea, i) => (patron.test(linea) && !excepto?.test(linea) ? [`${ruta}:${i + 1}`] : [])),
  );
}

// Sin distinguir mayúsculas: 'E-mail' o 'Un Admin' al inicio de una frase también cuentan.
const EN_INGLES = /Reset password|e-mail|hallazgo\(s\)|dominio\(s\)/i;
// Los comentarios del código pueden decir Admin: solo cuentan las líneas que no son comentario.
const ADMIN_ABREVIADO = /^(?!\s*(\/\/|\/?\*)).*(un Admin\b|Solo Admin\b)/i;

test("los patrones de textos no distinguen mayúsculas", () => {
  for (const texto of ["E-mail", "E-MAIL", "RESET PASSWORD", "Hallazgo(s)", "Dominio(s)"]) assert.match(texto, EN_INGLES);
  for (const texto of ["Un Admin registra", "solo admin puede", "  SOLO ADMIN"]) assert.match(texto, ADMIN_ABREVIADO);
  assert.doesNotMatch("  // Solo Admin: comentario del código", ADMIN_ABREVIADO);
});

test("ningún texto dice 'Reset password', 'e-mail' ni 'hallazgo(s)'", () => {
  assert.deepEqual(buscar(EN_INGLES), []);
});

test("los textos para el usuario dicen Administrador, no Admin", () => {
  assert.deepEqual(buscar(ADMIN_ABREVIADO), []);
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

test("un conteo de 1 va en singular: '1 dominio', '1 acción', '1 hallazgo'", () => {
  assert.equal(cantidad(1, "dominio"), "1 dominio");
  assert.equal(cantidad(0, "hallazgo"), "0 hallazgos");
  assert.equal(cantidad(1, "acción", "acciones"), "1 acción");
  assert.equal(cantidad(3, "acción", "acciones"), "3 acciones");
  // Ningún conteo pega a mano el plural de dominios, hallazgos, acciones o activos, salvo la rama de un '=== 1 ?'.
  assert.deepEqual(buscar(/(length|total|findings|assets|recalculated_domains)\}? (dominios|hallazgos|acciones|activos)\b/, /=== 1 \?/), []);
  assert.match(leer("app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx"), /findings\.total === 1 \? "Ver el hallazgo"/);
});

test("Dominios del Administrador va en una columna: la tabla no queda angosta desde 1536 px", () => {
  assert.doesNotMatch(leer("components/screens/dominios/DomainsAdmin.tsx"), /grid-cols/);
});

test("la tabla Dominios no muestra la hora de un escaneo fallido sin decir que falló", () => {
  const dominio = { last_scan_at: "2026-11-10T12:00:00Z" };
  const fallidoViejo = { status: "failed", finished_at: "2026-11-09T12:00:00Z" };
  assert.equal(failedScanAt(dominio, fallidoViejo), null);
  assert.equal(lastScanAt(dominio, fallidoViejo), dominio.last_scan_at);
  for (const status of ["completed", "partial"]) {
    assert.equal(lastScanAt(dominio, { status, finished_at: "2026-11-10T12:05:00Z" }), "2026-11-10T12:05:00Z");
  }
  assert.equal(lastScanAt(dominio, undefined), dominio.last_scan_at);
  assert.match(leer("components/screens/dashboard/DomainsRiskTable.tsx"), /const finishedAt = lastScanAt\(d, lastScans\.get\(d\.fqdn\)\);/);
});

test("un 401 sin causa conocida no dice 'inactividad': el aviso nombra las tres causas", () => {
  assert.match(leer("app/auth/expirada/route.ts"), /"\/login\?notice=ended"/);
  assert.match(leer("app/(auth)/login/page.tsx"), /ended: "Tu sesión ya no es válida: venció por inactividad, llegó a su máximo de 8 horas o se cerró en otro lado\./);
  // 'expired' queda solo para el reloj de inactividad de IdleTimeout, que sí sabe la causa.
  const expired = buscar(/notice=expired/);
  assert.equal(expired.length, 1);
  assert.match(expired[0], /IdleTimeout\.tsx:\d+$/);
});
