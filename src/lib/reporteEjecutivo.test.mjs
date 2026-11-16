// Reporte ejecutivo en PDF (#45, RC-70): de 1 a 2 páginas con el JSON de GET /domains/{fqdn}/report, la atribución
// de Have I Been Pwned y sin filtro de fechas. node --test, sin red.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExecutivePdf, insights, MAX_PAGES } from "./reporteEjecutivo.ts";

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
  assert.equal(insights(todos, LABELS)[2], "2 de los 4 hallazgos abiertos aparecieron en el último escaneo.");
});
