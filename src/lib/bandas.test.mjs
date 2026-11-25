// Pruebas sin red de las bandas de riesgo por cliente del portal (RC-237). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mockWeights } from "../mocks/api/contrato.ts";
import { bandaEnRangos, errorDeCortes, mensajeDePesos, mismosCortes, vistaPrevia } from "./bandas.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const PLANTILLA = { medium: 40, high: 60, critical: 80 };

test("1. errorDeCortes sigue el CHECK de la migración 022 en sus bordes", () => {
  for (const buenos of [PLANTILLA, { medium: 10, high: 20, critical: 30 }, { medium: 71, high: 81, critical: 91 }, { medium: 50, high: 70, critical: 85 }]) {
    assert.equal(errorDeCortes(buenos), null, JSON.stringify(buenos));
  }
  const malos = [
    { medium: 9, high: 20, critical: 30 },    // bajo con 9
    { medium: 40, high: 49, critical: 80 },   // medio con 9
    { medium: 40, high: 60, critical: 69 },   // alto con 9
    { medium: 40, high: 60, critical: 92 },   // crítico con 9
    { medium: 60, high: 40, critical: 80 },   // fuera de orden
    { medium: 40.5, high: 60, critical: 80 }, // no entero
  ];
  for (const c of malos) assert.equal(typeof errorDeCortes(c), "string", JSON.stringify(c));
  assert.match(errorDeCortes({ medium: 40.5, high: 60, critical: 80 }), /entero/);
});

test("2. la vista previa de la plantilla da lo mismo que GET /scoring/weights de la plantilla", () => {
  const v = vistaPrevia(PLANTILLA);
  assert.deepEqual(v.bands, mockWeights.bands);
  assert.deepEqual(v.grades, mockWeights.grades);
  assert.deepEqual([v.floor.one_critical, v.floor.two_or_more_critical], [mockWeights.floor.one_critical, mockWeights.floor.two_or_more_critical]);
  assert.deepEqual(mockWeights.band_cutoffs, PLANTILLA);
  assert.deepEqual(mockWeights.band_cutoffs_template, PLANTILLA);
});

test("3. con 50, 70 y 85 un crítico deja el score en 70: alto y D, como criterio.py", () => {
  const v = vistaPrevia({ medium: 50, high: 70, critical: 85 });
  assert.deepEqual(v.bands.map((b) => [b.band, b.from, b.to]), [["low", 0, 49], ["medium", 50, 69], ["high", 70, 84], ["critical", 85, 100]]);
  assert.deepEqual(v.grades.map((g) => [g.grade, g.from, g.to]), [["A", 0, 24], ["B", 25, 49], ["C", 50, 69], ["D", 70, 84], ["F", 85, 100]]);
  assert.deepEqual(v.floor, { one_critical: 70, two_or_more_critical: 85 });
  assert.equal(bandaEnRangos(v.floor.one_critical, v.bands), "high");
  // con un medio impar la B empieza en la mitad hacia abajo, como medium // 2
  assert.deepEqual(vistaPrevia({ medium: 45, high: 60, critical: 80 }).grades.slice(0, 2).map((g) => [g.from, g.to]), [[0, 21], [22, 44]]);
});

test("4. bandaEnRangos busca en los rangos de la API y no tiene cortes fijos", () => {
  const rangos = vistaPrevia({ medium: 50, high: 70, critical: 85 }).bands;
  assert.deepEqual([0, 49, 50, 69, 70, 84, 85, 100].map((s) => bandaEnRangos(s, rangos)),
    ["low", "low", "medium", "medium", "high", "high", "critical", "critical"]);
  assert.equal(bandaEnRangos(60, mockWeights.bands), "high");
  assert.equal(bandaEnRangos(101, rangos), null);
  assert.equal(mismosCortes(PLANTILLA, { ...PLANTILLA }), true);
  assert.equal(mismosCortes(PLANTILLA, { ...PLANTILLA, critical: 81 }), false);
});

test("5. el portal ya no tiene las bandas 40, 60 y 80 fijas", () => {
  const format = leer("./format.ts");
  assert.doesNotMatch(format, /scoreBand|riskLevel/);
  assert.match(leer("../app/(dashboard)/dashboard/page.tsx"), /bandaEnRangos\(average, weights\.bands\)/);
  assert.match(leer("../components/screens/alertas/AlertPoliciesForm.tsx"), /bandaEnRangos\(threshold, bands\)/);
  assert.doesNotMatch(leer("../components/screens/alertas/AlertPoliciesForm.tsx"), /valor por defecto \(60\)/);
  assert.match(leer("../app/(dashboard)/dashboard/alertas/page.tsx"), /bands=\{weights\.bands\}/);
});

test("6. el editor manda band_cutoffs solo si cambiaron y avisa que se recalcula el plan", () => {
  const editor = leer("../components/screens/admin/ScoringWeightsEditor.tsx");
  assert.match(editor, /updateScoringWeights\(categoryWeights, cutoffsChanged \? parsedCutoffs : undefined\)/);
  assert.match(editor, /!mismosCortes\(parsedCutoffs, savedCutoffs\)/);
  assert.match(editor, /errorDeCortes\(parsedCutoffs\)/);
  assert.match(editor, /vistaPrevia\(parsedCutoffs\)/);
  assert.match(editor, /plan de acción/);
  const servicio = leer("../services/scoringService.ts");
  assert.match(servicio, /band_cutoffs \? \{ category_weights, band_cutoffs \} : \{ category_weights \}/);
  const vista = leer("../components/screens/admin/ScoringWeightsView.tsx");
  assert.match(vista, /initialCutoffs=\{weights\.band_cutoffs\}/);
  assert.match(vista, /templateCutoffs=\{weights\.band_cutoffs_template\}/);
});

test("7. el editor no dice que activó una versión cuando solo puso al día scores viejos (RC-310)", () => {
  const base = { category_weights: {}, band_cutoffs: PLANTILLA };
  const igual = mensajeDePesos({ ...base, rule_set_version: 3, recalculated_domains: 0, skipped_domains: 0, unchanged: true }, 3);
  assert.match(igual, /no cambiaron; sigue activa la versión 3\.$/);
  const alDia = mensajeDePesos({ ...base, rule_set_version: 3, recalculated_domains: 1, skipped_domains: 1, unchanged: false }, 3);
  assert.doesNotMatch(alDia, /Se activó/);
  assert.match(alDia, /sigue activa la versión 3 y se puso al día el score de 1 dominio que venía de otra versión\./);
  assert.match(alDia, /Quedó sin recalcular 1 dominio con score de ML/);
  const dos = mensajeDePesos({ ...base, rule_set_version: 3, recalculated_domains: 2, unchanged: false }, 3);
  assert.match(dos, /de 2 dominios que venían de otra versión\.$/);
  const dosSaltados = mensajeDePesos({ ...base, rule_set_version: 3, recalculated_domains: 0, skipped_domains: 2, unchanged: true }, 3);
  assert.match(dosSaltados, /Quedaron sin recalcular 2 dominios con score de ML/);
  const nueva = mensajeDePesos({ ...base, rule_set_version: 4, recalculated_domains: 3, unchanged: false }, 3);
  assert.equal(nueva, "Se activó la versión 4, con los cortes 40, 60 y 80, y se recalculó el score de 3 dominios.");
  const editor = leer("../components/screens/admin/ScoringWeightsEditor.tsx");
  assert.match(editor, /mensajeDePesos\(result, savedVersion\)/);
  assert.match(leer("../components/screens/admin/ScoringWeightsView.tsx"), /initialVersion=\{weights\.rule_set_version\}/);
  const etiquetas = leer("../config/labels.ts");
  assert.match(etiquetas, /"scoring\.scores_recalculated":/);
  assert.match(etiquetas, /"scoring\.weights_changed":/);
});
