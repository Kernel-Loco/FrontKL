// Prueba sin red: el CI de pruebas (.github/workflows/pruebas.yml lee .nvmrc) y la imagen (los dos FROM del
// Dockerfile) usan la misma versión de Node. Si se sube una, la prueba falla hasta subir la otra.
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const raiz = new URL("../../", import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), "utf8");

test("el CI lee la versión de Node de .nvmrc", () => {
  const flujo = leer(".github/workflows/pruebas.yml");
  assert.match(flujo, /^\s*node-version-file: \.nvmrc\s*$/m);
  assert.doesNotMatch(flujo, /^\s*node-version:/m);
});

test(".nvmrc y los FROM del Dockerfile piden la misma versión de Node", () => {
  const nvmrc = leer(".nvmrc").trim();
  assert.match(nvmrc, /^\d+\.\d+\.\d+$/);
  const desde = [...leer("Dockerfile").matchAll(/^FROM node:(\S+?)-/gm)].map((m) => m[1]);
  assert.equal(desde.length, 2);
  for (const version of desde) assert.equal(version, nvmrc);
});
