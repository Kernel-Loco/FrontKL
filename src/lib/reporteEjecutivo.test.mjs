// Reporte ejecutivo en PDF (#45, RC-70): de 1 a 2 páginas con el JSON de GET /domains/{fqdn}/report, la atribución
// de Have I Been Pwned y sin filtro de fechas. node --test, sin red.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { exportBlockReasons } from "../components/screens/shared/domainState.ts";
import { buildExecutivePdf, clip, insights, MAX_ACTION, MAX_ASSET, MAX_PAGES, MAX_TITLE } from "./reporteEjecutivo.ts";

const SEV = { critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo" };
const CAT = { infrastructure: "Infraestructura", digital_identity: "Identidad digital", configuration: "Configuración",
  data_leaks: "Fugas de datos" };
const LABELS = {
  severity: SEV,
  category: CAT,
  band: { low: "Bajo", moderate: "Moderado", high: "Alto", critical: "Crítico" },
  source: { web: "Visita web", hibp: "Have I Been Pwned" },
  formatDate: (iso) => iso.slice(0, 10),
  scoreCell: (score, grade, band, partial) => `${score} ${grade} ${band}${partial ? " (parcial)" : ""}`,
};
const HIBP = {
  source: "hibp", name: "Have I Been Pwned", url: "https://haveibeenpwned.com",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  text: "Los datos de exposición en brechas provienen de Have I Been Pwned (https://haveibeenpwned.com), de Troy Hunt, "
    + "bajo la licencia CC BY 4.0. LowTide solo guarda el hecho de la exposición, nunca contraseñas ni otros datos filtrados.",
};

function reporte(n, { largo = false } = {}) {
  const sevs = ["critical", "high", "medium", "low"];
  const findings = Array.from({ length: n }, (_, i) => ({
    title: `Hallazgo ${i + 1} ` + (largo ? "con un título largo de verdad ".repeat(7) : "corto"),
    severity: sevs[i % 4],
    category: "infrastructure",
    asset: largo ? `servicio-${i}.subdominio-muy-largo-de-pruebas.acme-demo.mx` : `s${i}.acme-demo.mx`,
    source: "web",
    // Uno de hace dos años: el reporte es del estado actual, no de un periodo.
    detected_at: i === n - 1 ? "2024-01-03T10:00:00Z" : "2026-11-10T10:00:00Z",
    recurrence: i % 2 ? "new" : "recurring",
    action: largo ? "Actualiza el servidor a una versión con soporte y revisa la configuración expuesta ".repeat(3).trim() : "Corrige.",
  }));
  return {
    domain: "acme-demo.mx", organization: "Acme Demo", generated_at: "2026-11-15T12:00:00Z",
    authorization: { valid_from: "2026-11-01", valid_until: "2027-11-01" },
    score: { score: 64, band: "high", grade: "D", partial_coverage: true, computed_at: "2026-11-14T12:00:00Z" },
    last_scan_at: "2026-11-14T11:00:00Z",
    open_findings: { critical: 3, high: 5, medium: 20, low: 12 },
    by_category: { infrastructure: 25, digital_identity: 5, configuration: 7, data_leaks: 3 },
    total_open: 40, findings, findings_omitted: 40 - n, attributions: [HIBP],
  };
}

// El texto del PDF sin comprimir: lo que va entre paréntesis en los operadores Tj, con los saltos de línea unidos.
function texto(doc) {
  const partes = [...doc.output().matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return partes.join(" ").replace(/\s+/g, " ");
}

test("1. 8 hallazgos de texto largo caben en 1 a 2 páginas", () => {
  const doc = buildExecutivePdf(reporte(8, { largo: true }), LABELS);
  const paginas = doc.getNumberOfPages();
  assert.ok(paginas >= 1 && paginas <= MAX_PAGES, `páginas: ${paginas}`);
  assert.equal(MAX_PAGES, 2);
  assert.equal(buildExecutivePdf(reporte(3), LABELS).getNumberOfPages(), 1);
});

test("2. trae la atribución de Have I Been Pwned, el 'Y N más' y los datos del JSON", () => {
  const t = texto(buildExecutivePdf(reporte(8), LABELS));
  assert.match(t, /Have I Been Pwned/);
  assert.match(t, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(t, /Y 32 hallazgos abiertos/);
  assert.match(t, /acme-demo\.mx/);
  assert.match(t, /64 D Alto \(parcial\)/);
  // Sin hallazgos de más ni de menos: los 8 de la lista, con su acción
  for (let i = 1; i <= 8; i += 1) assert.match(t, new RegExp(`Hallazgo ${i} corto`));
});

test("3. no filtra por fechas: un hallazgo de 2024 sigue en la lista", () => {
  const t = texto(buildExecutivePdf(reporte(8), LABELS));
  assert.match(t, /2024-01-03/);
});

test("4. la lectura ejecutiva usa las cifras de todos los abiertos", () => {
  const r = reporte(8);
  assert.deepEqual(insights(r, LABELS), [
    "8 hallazgos críticos o altos siguen abiertos y requieren prioridad de remediación.",
    "Infraestructura es la categoría con más hallazgos abiertos (25).",
  ]);
  assert.deepEqual(insights({ ...r, total_open: 0 }, LABELS), ["El dominio no tiene hallazgos abiertos."]);
  const todos = { ...r, findings: r.findings.slice(0, 4), findings_omitted: 0, total_open: 4 };
  // recurrence es contra el último escaneo de cada hallazgo, no el del dominio: la frase no dice 'el último escaneo'.
  assert.equal(insights(todos, LABELS)[2], "2 de los 4 hallazgos abiertos son nuevos en el escaneo más reciente que los revisó.");
});

test("5. títulos, activos y acciones sin tope en el JSON no abren una tercera página", () => {
  const r = reporte(8);
  r.findings = r.findings.map((f, i) => ({
    ...f,
    title: `CVE-2026-${1000 + i} en el servidor expuesto `.repeat(30),
    asset: `n${i}.`.repeat(150) + "acme-demo.mx",
    action: "Actualiza el servidor y revisa la configuración expuesta ".repeat(20),
  }));
  const paginas = buildExecutivePdf(r, LABELS).getNumberOfPages();
  assert.ok(paginas <= MAX_PAGES, `páginas: ${paginas}`);
  assert.equal(clip("a ".repeat(300), MAX_TITLE).length, MAX_TITLE);
  assert.ok(clip("x".repeat(500), MAX_ASSET).endsWith("…"));
  assert.equal(clip("Corto", MAX_ACTION), "Corto");
  assert.equal(clip(null, MAX_ACTION), "");
  // Los mismos topes de cirdan/reporte.py.
  assert.deepEqual([MAX_TITLE, MAX_ASSET, MAX_ACTION], [160, 120, 220]);
});

test("6. el reporte solo se frena sin carta vigente, como la API", () => {
  assert.deepEqual(exportBlockReasons(["txt_not_verified", "domain_paused", "scan_in_progress", "live_scan_not_allowed"]), []);
  assert.deepEqual(exportBlockReasons(["authorization_expired", "scan_in_progress"]), ["authorization_expired"]);
  for (const r of ["authorization_missing", "authorization_not_started", "authorization_revoked"]) {
    assert.deepEqual(exportBlockReasons([r]), [r]);
  }
});

test("7. cada ReportButton lleva key y el detalle le pasa solo los motivos de la carta", () => {
  const src = join(import.meta.dirname, "..");
  const archivos = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.tsx$/.test(e.name) ? [join(dir, e.name)] : []);
  const usos = archivos(src).flatMap((ruta) => [...readFileSync(ruta, "utf8").matchAll(/<ReportButton\b[^>]*>/g)].map((m) => [ruta, m[0]]));
  assert.ok(usos.length >= 2, "se esperan el detalle y el histórico");
  for (const [ruta, uso] of usos) assert.match(uso, /\bkey=\{/, ruta);
  const detalle = readFileSync(join(src, "app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx"), "utf8");
  assert.doesNotMatch(detalle, /disabledReason=\{blocked\}/);
  assert.match(detalle, /disabledReason=\{reportBlocked\}/);
});
