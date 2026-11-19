// Pruebas sin red de RC-229: códigos sin cobertura con su motivo, método del score con su motivo de caída y textos del
// panel del hallazgo, del histórico y del tablero. Node 22.18 o más nuevo:
//   node --test src/lib/cobertura.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { scoreMethodText } from "../config/labels.ts";
import { mockScore } from "../mocks/api/contrato.ts";
import { coverageGroups, coverageLines, NO_FINDINGS_PARTIAL, noFindingsTitle } from "./cobertura.ts";

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
  ];
  assert.deepEqual(coverageGroups(gaps).map((g) => g.reason), ["source_failed", "source_not_run", "no_api_key", "source_partial"]);
  assert.deepEqual(coverageLines(gaps), [
    "No respondió la fuente: crt.sh (lookalike_domain, cert_expired)",
    "No corrió en este escaneo (fuente apagada): Documentación de APIs (exposed_api_docs)",
    "Sin llave de la API de host de Shodan: Shodan (exposed_iot_device)",
    "La fuente respondió pero no pudo revisarlas: DNS (dmarc_missing); Fuente sin identificar (x_desconocido)",
  ]);
  assert.deepEqual(coverageGroups([]), []);
});

test("con cobertura parcial nunca dice 0 hallazgos ni 'Sin hallazgos abiertos'", () => {
  assert.equal(noFindingsTitle(true), "Sin hallazgos en las fuentes que respondieron");
  assert.equal(noFindingsTitle(false), "Sin hallazgos abiertos");
  // La pestaña: con cobertura parcial y sin hallazgos no dice 'Hallazgos (0)'.
  assert.match(leer("components/screens/detalle/DomainTabs.tsx"),
    /partial && findingsCount === 0 \? "Hallazgos \(parcial\)" : `Hallazgos \(\$\{findingsCount\}\)`/);
  const explorador = leer("components/screens/hallazgos/FindingsExplorer.tsx");
  assert.match(explorador, /partialCoverage \? NO_FINDINGS_PARTIAL : "Sin hallazgos abiertos"/);
  const detalle = leer("app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.match(detalle, /<EmptyState title=\{noFindingsTitle\(score\?\.partial_coverage \?\? false\)\} \/>/);
  assert.doesNotMatch(detalle, /<EmptyState title="Sin hallazgos abiertos" \/>/);
  // La franja del detalle y la de la pestaña nombran los códigos con su motivo.
  for (const archivo of [detalle, leer("app/(dashboard)/dashboard/hallazgos/page.tsx")]) {
    assert.match(archivo, /<CoverageGapsList gaps=\{score\.coverage_gaps\} \/>/);
  }
  assert.equal(NO_FINDINGS_PARTIAL, noFindingsTitle(true));
});

test("el simulado del score trae coverage_gaps como el contrato de BackKL", () => {
  assert.ok(Array.isArray(mockScore.coverage_gaps));
  assert.ok(mockScore.coverage_gaps.every((g) => ["source_failed", "source_not_run", "no_api_key", "source_partial"].includes(g.reason)));
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
  assert.match(tablero, /sin escaneo completo/);
  assert.match(tablero, /"Sin escaneo completo" : critical/);
  assert.match(leer("components/screens/dashboard/DomainsRiskTable.tsx"), /<Badge tone="gray">Sin escaneo completo<\/Badge>/);
});
