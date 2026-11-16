// Histórico del score (RC-62): la tabla dice con qué versión de pesos salió cada punto. node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pagina = readFileSync(new URL("../app/(dashboard)/dashboard/historico/page.tsx", import.meta.url), "utf8");

test("la tabla del histórico muestra la versión de pesos de cada punto", () => {
  const encabezado = pagina.slice(pagina.indexOf("<thead>"), pagina.indexOf("</thead>"));
  const filas = pagina.slice(pagina.indexOf("<tbody>"), pagina.indexOf("</tbody>"));
  assert.match(encabezado, />Versión de pesos<\/th>/);
  assert.match(filas, /<td[^>]*>\{point\.rule_set_version\}<\/td>/);
  // tantas columnas en el encabezado como celdas en cada fila
  assert.equal((encabezado.match(/<th /g) ?? []).length, (filas.match(/<td /g) ?? []).length);
});
