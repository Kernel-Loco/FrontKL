// Pruebas sin red de los textos de la página Revisión OWASP ASVS. Node 22.18 o más nuevo, que quita los tipos de
// asvs.ts:
//   npm test
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ASVS } from "./asvs.ts";

// Huella del requisito, el estado y el texto público de cada fila de la revisión del 23 de noviembre de 2026. Es la
// misma que revisa la prueba de la revisión en el backend: si cambia allá, se copian de nuevo los textos y cambia aquí.
const HUELLA_DE_LA_REVISION = "d54126d8ce1cdd735302ebdb1c281312f54d0607eafd062b8f8fbc9daf7be77a";

const ESTADOS = ["Cumple", "No cumple", "No aplica"];

// Las mismas reglas que seguridad.test.mjs: la página es pública.
const PROHIBIDO = [
  [/RC-\d/i, "una clave de Jira"],
  [/#\d/, "un número de backlog o de PR"],
  [/\bPR\s*\d/i, "un número de PR"],
  [/cirdan/i, "el nombre clave"],
];
const RUTA_DEL_REPO = /\b(src|cirdan|db|docs|pruebas|scripts)\/|\.(py|sql|tsx?|mjs|md|ya?ml)\b/;

/** Todos los textos del archivo, con el camino de cada uno. */
function textos(valor, camino = "ASVS") {
  if (typeof valor === "string") return [[camino, valor]];
  if (valor === null || typeof valor !== "object") return [];
  return Object.entries(valor).flatMap(([llave, hijo]) => textos(hijo, `${camino}.${llave}`));
}

test("trae los 70 requisitos de nivel 1, sin repetir, con estado válido y sin vacíos", () => {
  const ids = ASVS.requisitos.map((r) => r.id);
  assert.equal(ids.length, 70);
  assert.equal(new Set(ids).size, 70);
  for (const r of ASVS.requisitos) {
    assert.match(r.id, /^V\d+\.\d+\.\d+$/, r.id);
    assert.ok(ESTADOS.includes(r.estado), r.id);
    assert.ok(ASVS.capitulos.some((c) => r.id.startsWith(`${c.id}.`)), `${r.id} sin capítulo`);
  }
  assert.deepEqual(ASVS.capitulos.map((c) => c.id), Array.from({ length: 17 }, (_, i) => `V${i + 1}`));
  for (const [camino, texto] of textos(ASVS)) assert.ok(texto.trim().length > 0, camino);
});

test("los textos son los de la revisión: la misma huella que el backend", () => {
  const filas = ASVS.requisitos.map((r) => `${r.id}|${r.titulo}|${r.estado}|${r.texto}`).join("\n");
  const huella = createHash("sha256").update(filas).digest("hex");
  assert.equal(
    huella,
    HUELLA_DE_LA_REVISION,
    "Los textos ya no son los de la revisión. Cópialos de nuevo de la revisión vigente del backend y actualiza la huella.",
  );
});

test("un requisito en corrección dice su plan y uno que no aplica, su porqué", () => {
  for (const r of ASVS.requisitos) {
    if (r.estado === "No cumple") assert.ok(r.texto.startsWith("En corrección:"), r.id);
    if (r.estado === "No aplica") assert.ok(r.texto.startsWith("No aplica:"), r.id);
  }
});

test("no trae claves de Jira, números de PR, rutas del repo, código ni el nombre clave", () => {
  for (const [camino, texto] of textos(ASVS)) {
    for (const [patron, que] of PROHIBIDO) assert.ok(!patron.test(texto), `${camino} trae ${que}`);
    assert.ok(!RUTA_DEL_REPO.test(texto), `${camino} trae una ruta del repo`);
    assert.ok(!texto.includes("`"), `${camino} trae código`);
  }
});

test("la página saca todo su texto del archivo, no trae claves y Seguridad la enlaza", () => {
  const pagina = readFileSync(new URL("../app/seguridad/asvs/page.tsx", import.meta.url), "utf8");
  for (const campo of ["titulo", "intro", "fecha", "atribucion"]) assert.ok(pagina.includes(`ASVS.${campo}`), campo);
  assert.ok(pagina.includes('"En corrección"'), "un No cumple se muestra como En corrección");
  for (const [patron, que] of PROHIBIDO) assert.ok(!patron.test(pagina), `la página trae ${que}`);
  const seguridad = readFileSync(new URL("../app/seguridad/page.tsx", import.meta.url), "utf8");
  assert.ok(seguridad.includes('href="/seguridad/asvs"'), "la página Seguridad no enlaza la revisión");
});
