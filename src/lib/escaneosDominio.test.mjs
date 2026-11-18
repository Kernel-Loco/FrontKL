// RC-318: la página del dominio pide sus propios escaneos con /scans?domain=<fqdn>&limit=5, no los 50 de la empresa.
// node --test, sin red. Los servicios usan alias @/ y se leen como texto, como en exportarSiem.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. getScans manda domain, limit y offset como parámetros de /scans", () => {
  const servicio = leer("../services/queries.ts");
  const scans = servicio.slice(servicio.indexOf("export const getScans"));
  assert.match(scans, /\(\{ domain, limit, offset \}: \{ domain\?: string; limit\?: number; offset\?: number \} = \{\}\)/);
  assert.match(scans, /const query = new URLSearchParams\(\);/);
  assert.match(scans, /query\.set\("domain", domain\)/);
  assert.match(scans, /query\.set\("limit", String\(limit\)\)/);
  assert.match(scans, /query\.set\("offset", String\(offset\)\)/);
  assert.match(scans, /apiGet<ListResponse<Scan>>\(qs \? `\/scans\?\$\{qs\}` : "\/scans"\)/);
});

test("2. el detalle del dominio pide sus 5 escaneos más nuevos", () => {
  const pagina = leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.match(pagina, /getScans\(\{ domain: fqdn, limit: 5 \}\)\.catch\(/);
  assert.doesNotMatch(pagina, /getScans\(\)/);
});
