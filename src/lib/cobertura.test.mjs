// Pruebas sin red de RC-229: códigos sin cobertura con su motivo, método del score con su motivo de caída y textos del
// panel del hallazgo, del histórico y del tablero. Node 22.18 o más nuevo:
//   node --test src/lib/cobertura.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { scoreMethodText } from "../config/labels.ts";
import { mockExplanation, mockScore } from "../mocks/api/contrato.ts";
import { unscannedDomains } from "../components/screens/shared/domainState.ts";
import {
  COVERAGE_GAPS_EMPTY, COVERAGE_GAPS_MISSING, coverageGapsFallback, coverageGroups, coverageIncomplete, coverageLines,
  criticalKpi, cveFacts, epssText, findingsCountLabel, NO_CRITICAL_INCOMPLETE, NO_FINDINGS_PARTIAL, noFindingsTitle,
  OTHER_REASON_LABEL,
} from "./cobertura.ts";

const SRC = join(import.meta.dirname, "..");
const leer = (r) => readFileSync(join(SRC, r), "utf8");

test("los códigos sin cobertura se agrupan por motivo y por fuente, en orden fijo", () => {
  const gaps = [
    { code: "dmarc_missing", source: "dns", reason: "source_partial" },
    { code: "exposed_iot_device", source: "shodan", reason: "no_api_key" },
    { code: "lookalike_domain", source: "ct_logs", reason: "source_failed" },
    { code: "cert_expired", source: "ct_logs", reason: "source_failed" },
    { code: "exposed_api_docs", source: "api_docs", reason: "source_not_run" },
    { code: "x_desconocido", source: null, reason: "source_partial" },
    { code: "cert_expired", source: "ct_logs", reason: "partially_checked" },
  ];
  assert.deepEqual(coverageGroups(gaps).map((g) => g.reason),
    ["source_failed", "source_not_run", "no_api_key", "source_partial", "partially_checked"]);
  assert.deepEqual(coverageLines(gaps), [
    "No respondió la fuente: crt.sh (lookalike_domain, cert_expired)",
    "No corrió en este escaneo (fuente apagada): Documentación de APIs (exposed_api_docs)",
    "Sin llave de la API de host de Shodan: Shodan (exposed_iot_device)",
    "La fuente respondió pero no pudo revisarlas: DNS (dmarc_missing); Fuente sin identificar (x_desconocido)",
    "Revisadas solo en una parte de lo de la fuente: crt.sh (cert_expired)",
  ]);
  assert.deepEqual(coverageGroups([]), []);
});

test("un motivo que el portal no conoce va en 'Otro motivo', no se descarta", () => {
  const groups = coverageGroups([
    { code: "spf_missing", source: "dns", reason: "motivo_nuevo" },
    { code: "lookalike_domain", source: "ct_logs", reason: "source_failed" },
  ]);
  assert.deepEqual(groups.map((g) => g.label), ["No respondió la fuente", OTHER_REASON_LABEL]);
  assert.deepEqual(groups[1].sources, [{ source: "dns", name: "DNS, motivo_nuevo", codes: ["spf_missing"] }]);
});

test("cobertura incompleta con partial_coverage o con códigos sin revisar (hallazgo 1)", () => {
  const gap = { code: "exposed_api_docs", source: "api_docs", reason: "source_not_run" };
  assert.equal(coverageIncomplete(null), false);
  assert.equal(coverageIncomplete({ partial_coverage: false, coverage_gaps: [] }), false);
  assert.equal(coverageIncomplete({ partial_coverage: false }), false);
  assert.equal(coverageIncomplete({ partial_coverage: true, coverage_gaps: [] }), true);
  // score.json del contrato: códigos source_not_run con partial_coverage en false
  assert.equal(coverageIncomplete({ partial_coverage: false, coverage_gaps: [gap] }), true);
  assert.equal(coverageIncomplete(mockScore), mockScore.partial_coverage || mockScore.coverage_gaps.length > 0);
  assert.equal(noFindingsTitle(coverageIncomplete({ partial_coverage: false, coverage_gaps: [gap] })), NO_FINDINGS_PARTIAL);
});

test("el contador no dice '0 de 0' con cobertura parcial (hallazgo 2)", () => {
  assert.equal(findingsCountLabel(0, 0, true), "Ningún hallazgo registrado en las fuentes que respondieron");
  assert.doesNotMatch(findingsCountLabel(0, 0, true), /\b0\b/);
  assert.equal(findingsCountLabel(0, 0, false), "0 de 0 hallazgos");
  assert.equal(findingsCountLabel(0, 3, true), "0 de 3 hallazgos");
  assert.equal(findingsCountLabel(1, 1, true), "1 de 1 hallazgo");
});

test("el KPI de críticos no da 0 a secas con dominios parciales o sin escaneo completo (hallazgo 3)", () => {
  // A: todos los dominios con score son parciales y sin críticos
  assert.deepEqual(criticalKpi(0, 2, 2, 0),
    { value: NO_CRITICAL_INCOMPLETE, hint: "0 críticos abiertos registrados · cobertura parcial: puede no estar al día" });
  // B: un dominio con score completo sin críticos y uno autorizado sin score
  assert.deepEqual(criticalKpi(0, 1, 0, 1),
    { value: NO_CRITICAL_INCOMPLETE, hint: "0 críticos abiertos registrados · 1 dominio sin escaneo completo" });
  // Sin ningún score
  assert.equal(criticalKpi(0, 0, 0, 2).value, "Sin escaneo completo");
  // Todo completo: 0 es 0
  assert.deepEqual(criticalKpi(0, 3, 0, 0), { value: 0, hint: "" });
  // Con críticos sale el número y la pista avisa
  assert.deepEqual(criticalKpi(2, 1, 1, 1),
    { value: 2, hint: "1 dominio sin escaneo completo · cobertura parcial: puede no estar al día" });
});

test("solo los autorizados sin score cuentan como sin escaneo completo (hallazgo 4)", () => {
  const dominio = (fqdn, score, auth, txt = "verified", status = "verified") =>
    ({ fqdn, score, status, authorization: { status: auth }, txt: { status: txt } });
  const lista = [
    dominio("a.mx", null, "valid"),
    dominio("b.mx", null, "missing", "pending", "pending_verification"),
    dominio("c.mx", null, "expired"),
    dominio("d.mx", null, "valid", "pending", "pending_verification"),
    dominio("e.mx", 40, "valid"),
  ];
  assert.deepEqual(unscannedDomains(lista).map((d) => d.fqdn), ["a.mx"]);
});

test("EPSS chico no sale como 0.0 % (hallazgo 8)", () => {
  assert.equal(epssText(0.00043), "0.04 %");
  assert.equal(epssText(0.00004), "< 0.01 %");
  assert.equal(epssText(0), "0.00 %");
  assert.equal(epssText(0.9731), "97.31 %");
});

test("el simulado de la explicación trae los campos de explicacion.json (hallazgo 10)", () => {
  for (const campo of ["rule_title", "meaning", "model_version", "model_fallback_reason", "model_prediction",
    "explanation_model_version"]) {
    assert.ok(campo in mockExplanation, campo);
  }
  assert.ok(mockExplanation.meaning.length > 0);
});

test("con cobertura parcial nunca dice 0 hallazgos ni 'Sin hallazgos abiertos'", () => {
  assert.equal(noFindingsTitle(true), "Sin hallazgos en las fuentes que respondieron");
  assert.equal(noFindingsTitle(false), "Sin hallazgos abiertos");
  // La pestaña: con cobertura parcial y sin hallazgos no dice 'Hallazgos (0)'.
  assert.match(leer("components/screens/detalle/DomainTabs.tsx"),
    /partial && findingsCount === 0 \? "Hallazgos \(parcial\)" : `Hallazgos \(\$\{findingsCount\}\)`/);
  const explorador = leer("components/screens/hallazgos/FindingsExplorer.tsx");
  assert.match(explorador, /partialCoverage \? NO_FINDINGS_PARTIAL : "Sin hallazgos abiertos"/);
  assert.match(explorador, /findingsCountLabel\(visible\.length, findings\.length, partialCoverage \|\| unscored\)/);
  const detalle = leer("app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.match(detalle, /<EmptyState title=\{noFindingsTitle\(coverageIncomplete\(score\)\)\} \/>/);
  assert.match(detalle, /\{coverageIncomplete\(score\) && \(/);
  // El gauge marca parcial con lo mismo que la alerta de al lado, no solo con partial_coverage.
  assert.match(detalle, /<RiskGauge[^>]*partial=\{coverageIncomplete\(score\)\}/);
  const hallazgos = leer("app/(dashboard)/dashboard/hallazgos/page.tsx");
  assert.match(hallazgos, /partialCoverage=\{coverageIncomplete\(score\)\}/);
  assert.match(hallazgos, /hasScore, coverageIncomplete\(score\)\)/);
  assert.doesNotMatch(hallazgos, /score\??\.partial_coverage/);
  assert.match(detalle, /domain\.score !== null, coverageIncomplete\(score\)\)/);
  assert.doesNotMatch(detalle, /<EmptyState title="Sin hallazgos abiertos" \/>/);
  // La franja del detalle y la de la pestaña nombran los códigos con su motivo.
  for (const archivo of [detalle, leer("app/(dashboard)/dashboard/hallazgos/page.tsx")]) {
    assert.match(archivo, /<CoverageGapsList gaps=\{score\.coverage_gaps\} \/>/);
  }
  assert.equal(NO_FINDINGS_PARTIAL, noFindingsTitle(true));
});

test("el simulado del score trae coverage_gaps como el contrato de BackKL", () => {
  assert.ok(Array.isArray(mockScore.coverage_gaps));
  assert.ok(mockScore.coverage_gaps.every((g) => ["source_failed", "source_not_run", "no_api_key", "source_partial",
    "partially_checked"].includes(g.reason)));
});

test("el método del score dice la versión del modelo o el motivo de caída", () => {
  assert.equal(scoreMethodText("ml", "v3", null), "Modelo de ML v3");
  assert.equal(scoreMethodText("ml", null, null), "Modelo de ML");
  assert.equal(scoreMethodText("rules", null, "artefacto_ml_no_disponible"), "Reglas: el modelo no está disponible");
  assert.equal(scoreMethodText("rules", null, "motivo_nuevo"), "Reglas: motivo_nuevo");
  assert.equal(scoreMethodText("rules", null, null), "Reglas");
  const historico = leer("app/(dashboard)/dashboard/historico/page.tsx");
  assert.match(historico, /<th scope="col" className=\{TH\}>Método<\/th>/);
  assert.match(historico, /scoreMethodText\(point\.method, point\.model_version, point\.model_fallback_reason\)/);
});

test("el panel del hallazgo tiene 'Qué significa', 'Cómo se calculó' y CVSS, EPSS y KEV", () => {
  const panel = leer("components/screens/hallazgos/ExplanationPanel.tsx");
  assert.match(panel, />Qué significa</);
  assert.match(panel, />Cómo se calculó</);
  assert.match(panel, /scoreMethodText\(explanation\.method, explanation\.model_version, explanation\.model_fallback_reason\)/);
  assert.match(panel, />CVSS</);
  assert.match(panel, />EPSS</);
  assert.match(panel, />KEV de CISA</);
  assert.match(panel, /finding\.in_kev \?/);
  // El encabezado dice la severidad del hallazgo, no '¿Por qué es crítico?' en uno bajo.
  assert.doesNotMatch(panel, /¿Por qué es crítico\?/);
  assert.match(panel, /¿Por qué tiene severidad \{SEVERITY_LABELS\[finding\.severity\]\.toLowerCase\(\)\}\?/);
});

test("el tablero no cuenta un dominio sin score como 0 críticos", () => {
  const tablero = leer("app/(dashboard)/dashboard/page.tsx");
  assert.match(tablero, /const kpi = criticalKpi\(critical, scored\.length, partialDomains\.length, unscanned\);/);
  assert.match(tablero, /const unscanned = unscannedDomains\(visible\)\.length;/);
  assert.match(tablero, /value=\{kpi\.value\}/);
  assert.match(leer("components/screens/dashboard/DomainsRiskTable.tsx"), /<Badge tone="gray">Sin escaneo completo<\/Badge>/);
});

test("sin ningún dominio con score el KPI no da 0 a secas, aunque ninguno esté autorizado (R1)", () => {
  // Pendiente TXT, Sin autorización o Vencido: unscanned 0, scored 0 y partial 0.
  assert.deepEqual(criticalKpi(0, 0, 0, 0), { value: "Sin escaneo completo", hint: "0 críticos abiertos registrados" });
  assert.deepEqual(criticalKpi(0, 0, 0, 2),
    { value: "Sin escaneo completo", hint: "0 críticos abiertos registrados · 2 dominios sin escaneo completo" });
  // Un primer escaneo caído puede guardar críticos sin score: sale el número.
  assert.equal(criticalKpi(3, 0, 0, 1).value, 3);
});

test("la franja del tablero dice que una fuente pudo no correr (R3)", () => {
  assert.match(leer("app/(dashboard)/dashboard/page.tsx"), /alguna fuente falló o no corrió,/);
});

test("las pestañas del histórico y del plan usan coverage_gaps, no solo partial_coverage (F1)", () => {
  for (const ruta of ["app/(dashboard)/dashboard/historico/page.tsx", "app/(dashboard)/dashboard/plan/page.tsx"]) {
    const pagina = leer(ruta);
    assert.match(pagina, /true, coverageIncomplete\(score\)\)\} \/>\}/, ruta);
    assert.match(pagina, /getDomainScore\(fqdn\)/, ruta);
    assert.doesNotMatch(pagina, /domainTabs\([^)]*partial_coverage/, ruta);
  }
});

test("CoverageGapsList sin lista o con la lista vacía no afirma que todo se revisó (F9 y R2)", () => {
  const gap = { code: "exposed_api_docs", source: "api_docs", reason: "source_not_run" };
  assert.equal(coverageGapsFallback(undefined), COVERAGE_GAPS_MISSING);
  assert.equal(coverageGapsFallback([]), COVERAGE_GAPS_EMPTY);
  assert.equal(coverageGapsFallback([gap]), null);
  assert.equal(coverageGapsFallback([{ ...gap, reason: "motivo_nuevo" }]), null);
  for (const texto of [COVERAGE_GAPS_MISSING, COVERAGE_GAPS_EMPTY]) assert.doesNotMatch(texto, /Todas las reglas se revisaron/);
  const lista = leer("components/screens/shared/CoverageGapsList.tsx");
  assert.match(lista, /const fallback = coverageGapsFallback\(gaps\);/);
  assert.match(lista, /if \(fallback !== null\) return <p className="mt-2">\{fallback\}<\/p>;/);
  assert.doesNotMatch(lista, /Todas las reglas se revisaron/);
});

test("CVSS, EPSS y KEV con lo que da /findings de un hallazgo con CVE (punto 2)", () => {
  // Los mismos valores que test_2b_cvss_epss_y_kev_del_catalogo_de_cves de BackKL (pruebas/test_api_v1.py).
  assert.deepEqual(cveFacts({ cvss: 9.8, epss: 0.00043, in_kev: true }),
    { cvss: "9.8", epss: "0.04 %", kev: "Explotada activamente" });
  // El stub que el cargador diario no ha revisado: in_kev null no es «No está en el catálogo».
  assert.deepEqual(cveFacts({ cvss: 7.5, epss: null, in_kev: null }),
    { cvss: "7.5", epss: "Sin dato", kev: "Sin dato" });
  // Revisada y fuera de KEV.
  assert.deepEqual(cveFacts({ cvss: 5.3, epss: 0.001, in_kev: false }),
    { cvss: "5.3", epss: "0.10 %", kev: "No está en el catálogo" });
  assert.deepEqual(cveFacts({ cvss: null, epss: 0, in_kev: false }),
    { cvss: "Sin dato", epss: "0.00 %", kev: "No está en el catálogo" });
  const panel = leer("components/screens/hallazgos/ExplanationPanel.tsx");
  for (const campo of ["cvss", "epss", "kev"]) assert.ok(panel.includes(`{cveFacts(finding).${campo}}`), campo);
  assert.match(panel, /\{finding\.cve_id \? \(/);
});
