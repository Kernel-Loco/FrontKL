// Pruebas sin red de la pantalla 'Activos' (RC-231). Node 22.18 o más nuevo:
//   node --test src/lib/filtrosActivos.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { conteo, consultaActivos, leerFiltros, paginas, POR_PAGINA, TIPOS_ACTIVO, urlFiltros } from "./filtrosActivos.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const DOMINIOS = ["acme-demo.mx", "acme-tienda.mx"];

test("1. lee los filtros válidos de la URL", () => {
  assert.deepEqual(leerFiltros({ dominio: "acme-demo.mx", tipo: "ip", q: "  www  ", pagina: "3" }, DOMINIOS), {
    dominio: "acme-demo.mx", tipo: "ip", texto: "www", pagina: 3,
  });
  assert.deepEqual(leerFiltros({}, DOMINIOS), { dominio: "", tipo: "", texto: "", pagina: 1 });
});

test("2. descarta lo que la API rechazaría o lo que no es de la empresa", () => {
  const f = leerFiltros({ dominio: "beta-corp.mx", tipo: "port", q: "x".repeat(201), pagina: "0" }, DOMINIOS);
  assert.deepEqual(f, { dominio: "", tipo: "", texto: "", pagina: 1 });
  for (const pagina of ["-1", "1.5", "abc", "20002", ""]) assert.equal(leerFiltros({ pagina }, DOMINIOS).pagina, 1, pagina);
  assert.equal(leerFiltros({ pagina: "20001" }, DOMINIOS).pagina, 20001);
  // Un parámetro repetido llega como arreglo: no se toma ninguno.
  assert.equal(leerFiltros({ dominio: ["acme-demo.mx", "acme-tienda.mx"] }, DOMINIOS).dominio, "");
  assert.equal(leerFiltros({ q: "x".repeat(200) }, DOMINIOS).texto.length, 200);
  // PostgreSQL no acepta el nulo en un text: con él la API respondería 422. Tampoco otros caracteres de control.
  for (const q of ["a\u0000b", "\u0000", "a\u001fb", "a\u007fb"]) assert.equal(leerFiltros({ q }, DOMINIOS).texto, "", q);
});

test("3. la consulta de la API pagina con offset y la exportación no lleva limit ni offset", () => {
  const f = { dominio: "acme-demo.mx", tipo: "subdomain", texto: "a&b=c", pagina: 3 };
  const q = new URLSearchParams(consultaActivos(f));
  assert.equal(q.get("domain"), "acme-demo.mx");
  assert.equal(q.get("type"), "subdomain");
  assert.equal(q.get("q"), "a&b=c");
  assert.equal(q.get("limit"), String(POR_PAGINA));
  assert.equal(q.get("offset"), String(2 * POR_PAGINA));
  const exportar = new URLSearchParams(consultaActivos(f, false));
  assert.equal(exportar.has("limit"), false);
  assert.equal(exportar.has("offset"), false);
  assert.equal(exportar.get("q"), "a&b=c");
  assert.equal(consultaActivos({ dominio: "", tipo: "", texto: "", pagina: 1 }, false), "");
  // La página más alta que deja leerFiltros cabe en el tope de offset de la API (le=1_000_000).
  assert.ok(Number(new URLSearchParams(consultaActivos({ dominio: "", tipo: "", texto: "", pagina: 20001 })).get("offset")) <= 1_000_000);
});

test("4. la URL de la pantalla no escribe la página 1 y va de ida y vuelta", () => {
  assert.equal(urlFiltros({ dominio: "", tipo: "", texto: "", pagina: 1 }), "");
  const f = { dominio: "acme-tienda.mx", tipo: "email", texto: "dmarc", pagina: 2 };
  const url = urlFiltros(f);
  assert.equal(url, "?dominio=acme-tienda.mx&tipo=email&q=dmarc&pagina=2");
  assert.deepEqual(leerFiltros(Object.fromEntries(new URLSearchParams(url)), DOMINIOS), f);
});

test("5. páginas: al menos una", () => {
  assert.equal(paginas(0), 1);
  assert.equal(paginas(POR_PAGINA), 1);
  assert.equal(paginas(POR_PAGINA + 1), 2);
});

test("5b. el conteo nunca muestra un rango al revés", () => {
  assert.equal(conteo(0, 0, 0), "0 activos");
  assert.equal(conteo(1, 0, 1), "1–1 de 1 activo");
  assert.equal(conteo(120, 50, 50), "51–100 de 120 activos");
  assert.equal(conteo(120, 100, 20), "101–120 de 120 activos");
  // Página 10 con 120 activos: la API da items vacío con offset 450.
  assert.equal(conteo(120, 450, 0), "120 activos");
});

test("6. los tipos son los mismos que acepta la API y que tienen etiqueta", () => {
  const api = leer("../types/api.ts").match(/export type AssetType =([^;]+);/)[1];
  assert.deepEqual([...api.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort(), [...TIPOS_ACTIVO].sort());
  const etiquetas = leer("../config/labels.ts");
  for (const t of TIPOS_ACTIVO) assert.match(etiquetas, new RegExp(`\\b${t}:`), t);
});

test("7. la sección 'activos' está en el menú de los tres roles y la pantalla la revisa", () => {
  const permisos = leer("../config/permissions.ts");
  assert.match(permisos, /activos: section\("activos", "Activos", "\/dashboard\/activos"/);
  const menus = permisos.slice(permisos.indexOf("export const ROLE_NAVIGATION"));
  for (const rol of ["analista", "gerente", "admin"]) {
    const bloque = menus.slice(menus.indexOf(`${rol}: [`)).match(/title: "Monitoreo", items: \[([^\]]*)\]/)[1];
    assert.match(bloque, /"activos"/, rol);
  }
  const pagina = leer("../app/(dashboard)/dashboard/activos/page.tsx");
  assert.match(pagina, /checkSectionAccess\("activos"\)/);
  assert.match(pagina, /if \(forbidden\) return forbidden;/);
});

test("8. la pantalla exporta solo CSV con los filtros y sin paginar, y tiene estado vacío", () => {
  const tabla = leer("../components/screens/activos/AssetsInventory.tsx");
  assert.match(tabla, /formats=\{\["csv"\]\}/);
  assert.match(tabla, /downloadAssets\(consultaActivos\(filtros, false\), signal\)/);
  assert.match(tabla, /<EmptyState title="Sin activos todavía">/);
  assert.match(tabla, /<EmptyState title="Ningún activo coincide">/);
  const exportar = leer("../services/exportService.ts");
  assert.match(exportar, /downloadAssets[\s\S]*?\/assets\?\$\{query\}[\s\S]*?"csv"/);
  // ApiExport pinta un botón por cada formato que recibe, no el par fijo CSV y JSON.
  const boton = leer("../components/screens/shared/ApiExport.tsx");
  assert.match(boton, /formats = \["csv", "json"\]/);
  assert.match(boton, /\{formats\.map\(\(format\) =>/);
  assert.doesNotMatch(boton, /\["csv", "json"\](?: as const)?\)\.map/);
  // Exportar se apaga sin autorización vigente, como responde la API.
  assert.match(tabla, /disabled=\{total === 0 \|\| sinCarta\}/);
  assert.match(leer("../app/(dashboard)/dashboard/activos/page.tsx"), /d\.authorization\.status === "valid"/);
});

test("9. los select no navegan al cambiar y la tabla no se vuelve a montar con los filtros", () => {
  const tabla = leer("../components/screens/activos/AssetsInventory.tsx");
  assert.doesNotMatch(tabla, /<select[^>]*onChange=\{[^}]*router\.push/);
  assert.match(tabla, /onChange=\{\(e\) => setDominio\(e\.target\.value\)\}/);
  assert.match(tabla, /urlFiltros\(\{ dominio, tipo, texto: texto\.trim\(\)\.slice\(0, 200\), pagina: 1 \}\)/);
  assert.doesNotMatch(leer("../app/(dashboard)/dashboard/activos/page.tsx"), /key=\{/);
});

test("10. la sección tiene su propio error.tsx", () => {
  assert.match(leer("../app/(dashboard)/dashboard/activos/error.tsx"), /<SectionError \{\.\.\.props\} section="Activos" \/>/);
});
