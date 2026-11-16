// Pruebas sin red de las frases SHAP del panel del hallazgo (#35, RC-71). Node 22.18 o más nuevo:
//   npm test
// El SHAP de BackKL es el de la clase predicha. Antes el panel decía 'aumenta el riesgo' con cualquier aporte
// positivo, también en un hallazgo que el modelo clasificó como baja.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SEVERITY_TONE, SOLID_TONES } from "../components/ui/tones.ts";
import { predictedClassText, SHAP_TONE, shapDirection, shapDisplay, shapLegend, shapPhrase, shapTone } from "./shap.ts";

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

// Revisión de RC-71 del 15 nov, hallazgos 1, 2 y 6: el detalle SHAP pintaba en naranja (alta) lo que acercaba a
// baja, y un aporte de 0 o de -0.003 mostraba '−0.00' mientras su frase y su barra decían que acercaba.
test("el signo, el color y la frase de un aporte siguen la misma regla", () => {
  for (const contribution of [0.4, 0.004, 0, -0, -0.003, -0.2]) {
    const acerca = shapDirection(contribution, "low").startsWith("acerca");
    assert.equal(shapDisplay(contribution).startsWith("+"), acerca, `signo de ${contribution}`);
    assert.equal(shapTone(contribution), acerca ? SHAP_TONE.toward : SHAP_TONE.away, `color de ${contribution}`);
  }
  assert.equal(shapDisplay(0.4), "+0.40");
  assert.equal(shapDisplay(-0.2), "−0.20");
});

test("el detalle SHAP no usa los colores de severidad", () => {
  const deSeveridad = Object.values(SEVERITY_TONE).flatMap((tone) => [SOLID_TONES[tone].text, SOLID_TONES[tone].bg]);
  for (const tono of Object.values(SHAP_TONE)) {
    assert.ok(!deSeveridad.includes(tono.text), tono.text);
    assert.ok(!deSeveridad.includes(tono.bar), tono.bar);
  }
  assert.notDeepEqual(SHAP_TONE.toward, SHAP_TONE.away);
  const panel = leer("../components/screens/hallazgos/ExplanationPanel.tsx");
  assert.match(panel, /display: shapDisplay\(s\.contribution\),\s*tone: shapTone\(s\.contribution\)/);
  // Ninguna fila decide el color por su cuenta: las dos listas pintan f.tone.
  assert.doesNotMatch(panel, /f\.value >= 0 \?/);
  assert.equal((panel.match(/\$\{f\.tone\.text\}/g) ?? []).length, 2);
  assert.equal((panel.match(/\$\{f\.tone\.bar\}/g) ?? []).length, 2);
});
