// Pruebas sin red de lo que el portal ya muestra de la API (HX4, HX5, HX15, HX16 y HX17, RC-131). Node 22.18 o más
// nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { detallesDelActivo } from "./atributos.ts";
import { MARCOS_ATRIBUCION, marcosDelHallazgo } from "./marcos.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. HX4: el inventario muestra tecnologías, CDN, registrador, país y ASN, sin 'No disponible'", () => {
  const ip = { attributes: { pais: "MX", asn: 13335, proveedor: "Cloudflare, Inc.", cdn: "cloudflare", fuente: "dns" } };
  assert.deepEqual(detallesDelActivo(ip), [
    { etiqueta: "CDN", valor: "Cloudflare" },
    { etiqueta: "País", valor: "MX" },
    { etiqueta: "ASN", valor: "AS13335 · Cloudflare, Inc." },
  ]);
  const web = { attributes: { tecnologias: [{ nombre: "nginx", version: "1.24" }, { nombre: "PHP", version: null }] } };
  assert.deepEqual(detallesDelActivo(web), [{ etiqueta: "Tecnologías", valor: "nginx 1.24, PHP" }]);
  const sinDatos = { attributes: { registrador: "No disponible", pais: "No disponible", asn: "No disponible" } };
  assert.deepEqual(detallesDelActivo(sinDatos), []);
  assert.match(leer("../components/screens/detalle/AssetsCard.tsx"), /detallesDelActivo\(a\)/);
});

test("2. HX15: los marcos salen con su enlace y la atribución de MITRE y CIS", () => {
  const marcos = marcosDelHallazgo({
    mitre_attack: { version: "v19", technique_id: "T1566", technique_name: "Phishing", source_url: "https://attack.mitre.org/techniques/T1566/", unmapped_reason: null },
    iso_27001_2022: { version: "2022", control_id: "A.8.23", control_name: "Filtrado web", source_url: null },
    cis_controls_v8_1: { version: "v8.1", safeguard_id: "9.5", safeguard_name: "DMARC", source_url: "javascript:alert(1)" },
  });
  assert.deepEqual(marcos.map((m) => m.texto), ["T1566 Phishing", "A.8.23 Filtrado web", "9.5 DMARC"]);
  assert.equal(marcos[0].url, "https://attack.mitre.org/techniques/T1566/");
  assert.equal(marcos[2].url, null, "solo enlaces https");
  assert.deepEqual(marcosDelHallazgo(undefined), []);
  assert.match(MARCOS_ATRIBUCION, /The MITRE Corporation/);
  assert.match(MARCOS_ATRIBUCION, /CC BY-NC-ND 4\.0/);
});

test("3. HX5, HX16 y HX17: CVE y CVSS, título y significado de la regla, y el modelo del score", () => {
  const panel = leer("../components/screens/hallazgos/ExplanationPanel.tsx");
  for (const campo of ["finding.cve_id", "finding.cvss", "explanation.rule_title", "explanation.meaning", "explanation.model_version", "explanation.explanation_model_version", "MARCOS_ATRIBUCION"]) {
    assert.ok(panel.includes(campo), `el panel no usa ${campo}`);
  }
  const pesos = leer("../components/screens/admin/ScoringWeightsView.tsx");
  assert.ok(pesos.includes("rule.title") && pesos.includes("rule.meaning"), "la tabla de reglas solo muestra el código");
  const detalle = leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.ok(detalle.includes("score.model_fallback_reason") && detalle.includes("score.model_version"));
});
