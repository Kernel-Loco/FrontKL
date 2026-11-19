// Prueba sin red (RC-293): el CI de .github/workflows/pruebas.yml instala con npm ci y corre npm audit con los dos
// niveles de la decisión 1, npm run lint, npm test y npm run build, sin secretos. Si alguien quita un paso o baja
// el nivel, esta prueba falla.
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const flujo = readFileSync(new URL("../../.github/workflows/pruebas.yml", import.meta.url), "utf8");
const comandos = [...flujo.matchAll(/^\s*run: (.+?)\s*$/gm)].map((m) => m[1]);

test("el CI corre npm ci, los dos npm audit, lint, test y build, en ese orden", () => {
  assert.deepEqual(comandos, [
    "npm ci",
    "npm audit --omit=dev --audit-level=low",
    "npm audit --audit-level=high",
    "npm run lint",
    "npm test",
    "npm run build",
  ]);
});

test("el CI no usa secretos ni deja la credencial de git en el checkout", () => {
  assert.doesNotMatch(flujo, /secrets\./);
  assert.match(flujo, /^\s*persist-credentials: false\s*$/m);
  assert.match(flujo, /^permissions:\n\s+contents: read\s*$/m);
});

test("cada paso después de npm ci corre aunque falle otro, pero solo si npm ci pasó", () => {
  const condicion = "if: ${{ !cancelled() && steps.instalar.outcome == 'success' }}";
  const pasos = flujo.split(/^\s*- /m).filter((p) => /^\s*run: /m.test(p) || /^name: /.test(p));
  const despues = pasos.filter((p) => !/run: npm ci\b/.test(p));
  assert.equal(despues.length, 5);
  for (const paso of despues) assert.ok(paso.includes(condicion), `falta la condición en: ${paso.trim()}`);
});
