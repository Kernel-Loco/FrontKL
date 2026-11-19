// Prueba sin red (RC-293): el CI de .github/workflows/pruebas.yml instala con npm ci y corre npm audit con los dos
// niveles de la decisión 1, npm run lint, npm test y npm run build, sin secretos, y nada deja pasar un error. Si
// alguien quita un paso, baja el nivel o silencia un fallo, esta prueba falla.
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const raiz = new URL("../../", import.meta.url);
// Con core.autocrlf=true el checkout de Windows deja CRLF: se normaliza para que la prueba pase igual que en el CI.
const leer = (ruta) => readFileSync(new URL(ruta, raiz), "utf8").replace(/\r\n/g, "\n");

const flujo = leer(".github/workflows/pruebas.yml");
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

test("ningún paso ni el job se tragan un fallo", () => {
  assert.doesNotMatch(flujo, /^\s*continue-on-error:/m);
  for (const comando of comandos) assert.doesNotMatch(comando, /\|\||;/, comando);
});

test("cada paso después de npm ci corre aunque falle otro, pero solo si npm ci pasó", () => {
  const condicion = "if: ${{ !cancelled() && steps.instalar.outcome == 'success' }}";
  const pasos = flujo.split(/^\s*- /m).filter((p) => /^\s*run: /m.test(p));
  const despues = pasos.filter((p) => !/run: npm ci\b/.test(p));
  assert.equal(despues.length, 5);
  for (const paso of despues) assert.ok(paso.includes(condicion), `falta la condición en: ${paso.trim()}`);
});

test("en dev y main un push nuevo no cancela la corrida del merge anterior", () => {
  assert.match(flujo, /^\s*cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}\s*$/m);
});

test("lint y build de package.json fallan con un error y los avisos de ESLint también frenan", () => {
  const { scripts } = JSON.parse(leer("package.json"));
  assert.equal(scripts.lint, "eslint --max-warnings=0");
  assert.equal(scripts.build, "next build");
  // next build revisa los tipos salvo que next.config.ts lo apague.
  assert.doesNotMatch(leer("next.config.ts"), /ignoreBuildErrors|ignoreDuringBuilds/);
});
