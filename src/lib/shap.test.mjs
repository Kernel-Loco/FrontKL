// Pruebas sin red de las frases SHAP del panel del hallazgo (#35, RC-71). Node 22.18 o más nuevo:
//   npm test
// El SHAP de BackKL es el de la clase predicha. Antes el panel decía 'aumenta el riesgo' con cualquier aporte
// positivo, también en un hallazgo que el modelo clasificó como baja.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { predictedClassText, shapDirection, shapLegend, shapPhrase } from "./shap.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const c = { tipo: "puerto_abierto", antiguedad_dias: 1, exposicion: "directa", sensibilidad: "baja" };
const FEATURES = [["tipo", "puerto_abierto"], ["antiguedad_dias", 1], ["exposicion", "directa"], ["sensibilidad", "baja"], ["otra_cosa", 3]];

test("un aporte positivo acerca a la clase predicha, no aumenta el riesgo", () => {
  for (const [feature, value] of FEATURES) {
    const baja = shapPhrase(feature, value, c, 0.4, "low");
    assert.match(baja, /acerca la predicción a severidad baja\.$/, feature);
    assert.doesNotMatch(baja, /riesgo/, feature);
    assert.match(shapPhrase(feature, value, c, 0.4, "high"), /acerca la predicción a severidad alta\.$/, feature);
  }
});

test("un aporte negativo aleja de la clase predicha", () => {
  for (const [feature, value] of FEATURES) {
    const frase = shapPhrase(feature, value, c, -0.2, "medium");
    assert.match(frase, /aleja la predicción de severidad media\.$/, feature);
    assert.doesNotMatch(frase, /riesgo/, feature);
  }
});

test("sin model_prediction no inventa la clase", () => {
  assert.equal(predictedClassText(undefined), "la severidad que predijo el modelo");
  assert.equal(predictedClassText(null), "la severidad que predijo el modelo");
  // critical nunca sale del modelo (BackKL lo pone por regla); no se nombra como clase predicha.
  assert.equal(predictedClassText("critical"), "la severidad que predijo el modelo");
  assert.equal(shapDirection(0.1, undefined), "acerca la predicción a la severidad que predijo el modelo");
  assert.equal(shapLegend("low"), "Positivo: acerca la predicción a severidad baja. Negativo: la aleja.");
});

test("el panel usa estas frases con model_prediction y ya no dice 'el riesgo'", () => {
  const panel = leer("../components/screens/hallazgos/ExplanationPanel.tsx");
  assert.match(panel, /from "@\/lib\/shap"/);
  assert.match(panel, /shapPhrase\([^)]*explanation\.model_prediction\)/);
  assert.match(panel, /shapLegend\(explanation\.model_prediction\)/);
  assert.doesNotMatch(panel, /(aumenta|reduce)[^\n]*el riesgo/);
  assert.match(leer("../types/api.ts"), /model_prediction\?: Severity \| null;/);
});
