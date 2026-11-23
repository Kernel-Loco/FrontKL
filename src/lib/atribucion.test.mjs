// Pruebas sin red de RC-54: «Fuente: Have I Been Pwned» con enlace en los hallazgos de HIBP. Node 22.18 o más nuevo:
//   node --test src/lib/atribucion.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { atribucionDe, atribucionDeRegla, atribucionesDe } from "./atribucion.ts";

const SRC = join(import.meta.dirname, "..");
const leer = (r) => readFileSync(join(SRC, r), "utf8");

test("los hallazgos de HIBP llevan 'Fuente: Have I Been Pwned' con enlace y licencia CC BY 4.0", () => {
  const a = atribucionDe("hibp");
  assert.equal(a.text, "Fuente: Have I Been Pwned");
  assert.equal(a.url, "https://haveibeenpwned.com");
  assert.equal(a.license, "CC BY 4.0");
  assert.equal(a.licenseUrl, "https://creativecommons.org/licenses/by/4.0/");
});

test("las demás fuentes no llevan atribución, tampoco una clave del prototipo", () => {
  for (const s of ["dns", "ct_logs", "shodan", "github", "constructor", "toString", "__proto__", ""]) {
    assert.equal(atribucionDe(s), null, s);
  }
});

test("una atribución por fuente en la lista, sin repetir", () => {
  const lista = [{ source: "dns" }, { source: "hibp" }, { source: "hibp" }, { source: "shodan" }];
  assert.deepEqual(atribucionesDe(lista).map((a) => a.name), ["Have I Been Pwned"]);
  assert.deepEqual(atribucionesDe([{ source: "dns" }]), []);
});

test("la tabla y el panel de hallazgos muestran la atribución con enlaces que abren aparte", () => {
  assert.match(leer("components/screens/hallazgos/FindingsExplorer.tsx"), /atribucionesDe\(visible\)/);
  assert.match(leer("components/screens/hallazgos/ExplanationPanel.tsx"), /atribucionDe\(finding\.source\)/);
  const comp = leer("components/screens/shared/SourceAttribution.tsx");
  assert.match(comp, /href=\{atribucion\.url\}/);
  assert.match(comp, /href=\{atribucion\.licenseUrl\}/);
  assert.equal((comp.match(/rel="noopener noreferrer/g) ?? []).length, 2);
});

test("por código de regla: los 3 de HIBP llevan su atribución y los demás no (comparación de scores)", () => {
  for (const c of ["breach_exposure", "breach_exposure_old", "breach_exposure_no_passwords"]) {
    assert.equal(atribucionDeRegla(c)?.text, "Fuente: Have I Been Pwned", c);
  }
  for (const c of ["dmarc_missing", "constructor", "__proto__", ""]) assert.equal(atribucionDeRegla(c), null, c);
});

test("el tablero y la comparación muestran la atribución de HIBP", () => {
  assert.match(leer("components/screens/dashboard/RecentChanges.tsx"), /atribucionesDe\(changes\.map/);
  assert.match(leer("components/screens/historico/CompareScans.tsx"), /atribucionDeRegla\(item\.rule_code\)/);
});
