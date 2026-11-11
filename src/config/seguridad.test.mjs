// Pruebas sin red de los textos de la página Seguridad. Node 22.18 o más nuevo, que quita los tipos de seguridad.ts:
//   npm test
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SEGURIDAD } from "./seguridad.ts";

// Huella de las fronteras y los controles del resumen de seguridad para clientes del 10 de noviembre de 2026, que
// se revisó contra el modelo de amenazas: solo trae controles que ya funcionan.
const HUELLA_DEL_RESUMEN = "f3a19c91f56f7670df5e68a338518389729dec824c473aeaba3a62fd4968ba9b";

const controles = SEGURIDAD.grupos.flatMap((grupo) => grupo.controles);

/** Todos los textos del archivo, con el camino de cada uno. */
function textos(valor, camino = "SEGURIDAD") {
  if (typeof valor === "string") return [[camino, valor]];
  if (valor === null || typeof valor !== "object") return [];
  return Object.entries(valor).flatMap(([llave, hijo]) => textos(hijo, `${camino}.${llave}`));
}

const PROHIBIDO = [
  [/RC-\d/i, "una clave de Jira"],
  [/#\d/, "un número de backlog o de PR"],
  [/\bPR\s*\d/i, "un número de PR"],
  [/cirdan/i, "el nombre clave"],
  [/\bC\d-[A-Z]\d/, "un id del modelo de amenazas"],
];
const RUTA_DEL_REPO = /\b(src|cirdan|db|docs|pruebas|scripts)\/|\.(py|sql|tsx?|mjs|md|ya?ml)\b/;

test("trae las 5 fronteras y los 24 controles, sin repetir ni dejar vacíos", () => {
  assert.equal(SEGURIDAD.fronteras.length, 5);
  assert.deepEqual(SEGURIDAD.fronteras.map((f) => f.id), ["TB1", "TB2", "TB3", "TB4", "TB5"]);
  assert.equal(controles.length, 24);
  assert.equal(new Set(controles.map((c) => c.tema)).size, 24);
  assert.equal(new Set(SEGURIDAD.grupos.map((g) => g.donde)).size, SEGURIDAD.grupos.length);
  for (const [camino, texto] of textos(SEGURIDAD)) assert.ok(texto.trim().length > 0, camino);
});

test("solo cita controles que ya funcionan: los textos son los del resumen revisado", () => {
  const { fronteras, grupos } = SEGURIDAD;
  const huella = createHash("sha256").update(JSON.stringify({ fronteras, grupos })).digest("hex");
  assert.equal(
    huella,
    HUELLA_DEL_RESUMEN,
    "Los textos ya no son los del resumen revisado. Un control planeado, parcial o con riesgo abierto no entra: " +
      "copia de nuevo los del resumen vigente y actualiza la huella.",
  );
});

test("no trae claves de Jira, números de PR, rutas del repo ni el nombre clave", () => {
  for (const [camino, texto] of textos(SEGURIDAD)) {
    for (const [patron, que] of PROHIBIDO) assert.ok(!patron.test(texto), `${camino} trae ${que}`);
    if (camino !== "SEGURIDAD.diagrama.src") assert.ok(!RUTA_DEL_REPO.test(texto), `${camino} trae una ruta del repo`);
  }
});

test("el producto se llama LowTide", () => {
  for (const [camino, texto] of textos(SEGURIDAD)) {
    for (const nombre of texto.match(/lowtide/gi) ?? []) assert.equal(nombre, "LowTide", camino);
  }
  assert.ok(SEGURIDAD.titulo.includes("LowTide"));
});

test("la página saca todo su texto del archivo y tampoco trae claves", () => {
  const pagina = readFileSync(new URL("../app/seguridad/page.tsx", import.meta.url), "utf8");
  for (const campo of ["titulo", "intro", "fecha", "fronterasIntro", "fronteras.map", "grupos.map"]) {
    assert.ok(pagina.includes(`SEGURIDAD.${campo}`), campo);
  }
  assert.ok(pagina.includes("grupo.controles.map"));
  for (const [patron, que] of PROHIBIDO) assert.ok(!patron.test(pagina), `la página trae ${que}`);
  for (const nombre of pagina.match(/lowtide/gi) ?? []) assert.equal(nombre, "LowTide");
});
