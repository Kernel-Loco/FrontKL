// Pruebas sin red de la letra, las subcategorías y los KRI del portal (#114, RC-232). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mockDomains, mockScore, mockScoreHistory, mockWeights } from "../mocks/api/contrato.ts";
import { kriTone } from "../components/ui/tones.ts";
import { gradeText, KRI_STATUS_LABELS, kriNote, kriView, PARTIAL_GRADE_NOTE, scoreCell, subcategoriesOf, subcategoryCoverage } from "./riesgo.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const kri = (cambios) => ({
  kri: "certificates", name: "Certificados", status: "ok", subcategories: ["certificates"], sources: ["ct_logs"],
  sources_failed: [], sources_not_run: [], sources_partial: [], rules_without_coverage: [],
  findings: 0, max_severity: null, penalty: 0, ...cambios,
});

test("1. la letra va junto al score y, con cobertura parcial, lleva el mismo aviso", () => {
  assert.equal(gradeText("D", false), "Letra D");
  assert.match(gradeText("D", true), /cobertura parcial/);
  assert.equal(scoreCell(60, "D", "Alto", false), "60, letra D (Alto)");
  assert.equal(scoreCell(60, "D", "Alto", true), `60, letra D (Alto)\n${PARTIAL_GRADE_NOTE}`);
  assert.match(PARTIAL_GRADE_NOTE, /score y su letra/);
  assert.equal(scoreCell(null, null, null, true), "-");
  // El mock trae la letra de la API: con score, letra; sin score, null.
  for (const d of mockDomains.items) assert.equal(d.grade === null, d.score === null, d.fqdn);
  assert.equal(mockScore.grade, "D");
  assert.ok(mockScoreHistory.items.every((p) => p.grade === "D"));
  assert.deepEqual(mockWeights.grades.map((g) => [g.grade, g.from, g.to]), [["A", 0, 19], ["B", 20, 39], ["C", 40, 59], ["D", 60, 79], ["F", 80, 100]]);
});

test("1b. el tablero, el detalle y el PDF pintan la letra que da la API", () => {
  assert.match(leer("../components/screens/dashboard/DomainsRiskTable.tsx"), /<GradeBadge grade=\{d\.grade\}[^>]*partial=\{partialDomains\.has\(d\.fqdn\)\}/);
  assert.match(leer("../components/screens/detalle/RiskGauge.tsx"), /<GradeBadge grade=\{grade\} band=\{band\} partial=\{partial\}/);
  assert.match(leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx"), /grade=\{score\.grade\}\s+partial=\{score\.partial_coverage\}/);
  assert.match(leer("../components/screens/historico/ExecutiveReportDownload.tsx"), /scoreCell\(domain\.score, domain\.grade, [^)]*domain\.partial_coverage\)/);
  // El aviso de la letra sale del score de cada dominio, no de una constante.
  assert.match(leer("../app/(dashboard)/dashboard/page.tsx"), /\(await getDomainScore\(domain\.fqdn\)\)\.partial_coverage \? "partial"/);
  assert.match(leer("../app/(dashboard)/dashboard/historico/page.tsx"), /grade: current\.grade, partial_coverage: current\.partial_coverage/);
});

test("2. los hallazgos de cada categoría se agrupan por subcategoría, en el orden de la API", () => {
  assert.deepEqual(subcategoriesOf("infrastructure", mockScore.subcategories).map((s) => s.subcategory),
    ["certificates", "exposed_services", "exposed_apis", "vulnerable_software", "domain_registration"]);
  for (const c of mockScore.categories) assert.ok(subcategoriesOf(c.category, mockScore.subcategories).length > 0, c.category);
  // Las 4 categorías juntas tienen los 4 hallazgos vigentes de acme-demo.mx.
  assert.equal(mockScore.subcategories.reduce((n, s) => n + s.findings, 0), 4);
  const otra = { category: "configuration", subcategory: "other", name: "Sin clasificar", findings: 1, penalty: 3 };
  assert.deepEqual(subcategoriesOf("configuration", [...mockScore.subcategories, otra]).at(-1), otra);
  assert.equal(subcategoriesOf("data_leaks", [otra]).length, 0);
  // Una subcategoría dice la cobertura de su KRI, para no mostrar un cero donde el KRI dice sin cobertura.
  const sinCt = mockScore.kris.map((k) => (k.kri === "certificates" ? kri({ status: "no_coverage", findings: null, penalty: null }) : k));
  assert.equal(subcategoryCoverage("certificates", sinCt), "no_coverage");
  assert.equal(subcategoryCoverage("exposed_apis", mockScore.kris), "partial");
  assert.equal(subcategoryCoverage("email", mockScore.kris), "ok");
  assert.equal(subcategoryCoverage("breaches", mockScore.kris), null);
  assert.match(leer("../components/screens/detalle/CategoryBars.tsx"), /incomplete && s\.findings === 0 \?/);
  assert.match(leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx"), /<CategoryBars [^>]*kris=\{score\.kris\}/);
});

test("3. el detalle trae los 5 KRI con el color de su severidad más alta y dice que no cubren todo el score", () => {
  assert.deepEqual(mockScore.kris.map((k) => k.kri), ["certificates", "service_exposure", "email", "impersonation", "reputation"]);
  assert.equal(kriView(mockScore.kris[0]).tone, "high");
  assert.equal(kriView(mockScore.kris[2]).tone, "medium");
  // El color es el de la severidad, como en el resto del portal; sin datos, gris, y verde solo sin hallazgos.
  assert.deepEqual(["critical", "high", "medium", "low", "clean", "unknown"].map(kriTone), ["red", "orange", "amber", "blue", "green", "gray"]);
  assert.match(leer("../components/screens/detalle/KriPanel.tsx"), /kriTone\(view\.tone\)/);
  const nota = kriNote(mockScore.subcategories, mockScore.kris);
  assert.match(nota, /no cubren todo el score/);
  assert.match(nota, /software vulnerable o sin soporte/);
  assert.match(nota, /brechas de datos/);
  assert.doesNotMatch(nota, /certificados|suplantación/i);
  assert.match(kriNote([], []), /no cubren todo el score/);
});

test("4. sin cobertura, sin fuente todavía y parcial nunca se pintan como sin riesgo ni en cero", () => {
  const sinCobertura = kriView(kri({ status: "no_coverage", findings: null, penalty: null, sources_failed: ["ct_logs"] }));
  assert.equal(sinCobertura.status, "Sin cobertura");
  assert.equal(KRI_STATUS_LABELS.no_coverage, "Sin cobertura");
  assert.equal(sinCobertura.detail, "No respondió: ct_logs");
  const sinFuente = kriView(mockScore.kris[4]);
  assert.equal(sinFuente.status, "Sin fuente todavía");
  const parcial = kriView(mockScore.kris[1]);
  assert.equal(parcial.status, "Cobertura parcial");
  assert.equal(parcial.detail, "No corrió: api_docs");
  // Con los nombres del portal, como pide el contrato.
  const nombres = { ct_logs: "crt.sh", api_docs: "Documentación de APIs" };
  assert.equal(kriView(mockScore.kris[1], (c) => nombres[c] ?? c).detail, "No corrió: Documentación de APIs");
  assert.match(leer("../components/screens/detalle/KriPanel.tsx"), /kriView\(kri, sourceName\)/);
  for (const vista of [sinCobertura, sinFuente, parcial]) {
    assert.notEqual(vista.tone, "clean");
    assert.notEqual(vista.value, "Sin hallazgos");
    assert.doesNotMatch(vista.value, /^0\b/);
    assert.ok(vista.warning);
  }
  assert.equal(sinCobertura.value, "—");
  assert.equal(sinFuente.value, "—");
  assert.equal(parcial.value, "—");
  // Solo con cobertura completa un cero es sin hallazgos.
  assert.deepEqual([kriView(kri({})).tone, kriView(kri({})).value], ["clean", "Sin hallazgos"]);
  assert.equal(kriView(kri({ status: "partial", findings: 2, max_severity: "critical" })).tone, "critical");
});

test("5. la alerta y el umbral siguen con el score de 0 a 100, sin letra", () => {
  for (const ruta of ["../components/screens/alertas/AlertPoliciesForm.tsx", "../services/settingsService.ts"]) {
    assert.doesNotMatch(leer(ruta), /grade|letra/i, ruta);
  }
  assert.equal(typeof mockScore.alert.threshold, "number");
  assert.equal(mockScore.alert.triggered, mockScore.score >= mockScore.alert.threshold);
  assert.doesNotMatch(leer("../types/api.ts").match(/export interface AlertPolicies \{[^}]*\}/)[0], /grade/);
});
