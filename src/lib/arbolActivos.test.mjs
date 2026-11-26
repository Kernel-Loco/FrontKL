// Pruebas sin red de la vista en árbol de 'Activos' (RC-248). Node 22.18 o más nuevo:
//   node --test src/lib/arbolActivos.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  abreAbierto,
  ABRE_ABIERTO_HASTA,
  armarArbol,
  consultasArbol,
  conVista,
  leerVista,
  MAX_ARBOL,
  paginasCuadran,
  POR_PETICION_ARBOL,
  soloArbol,
  textoSuelto,
} from "./arbolActivos.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

let n = 0;
const activo = (domain, type, value, parent = null, parent_type = null) =>
  ({ id: `id-${++n}`, domain, type, value, parent, parent_type });

/** El árbol como texto, para comparar la forma: 'valor' o 'valor [motivo]', con dos espacios por nivel. */
const forma = (ramas) => {
  const lineas = [];
  const nodo = (x, nivel) => {
    lineas.push(`${"  ".repeat(nivel)}${x.activo.value}${x.suelto ? ` [${x.suelto}]` : ""}`);
    for (const h of x.hijos) nodo(h, nivel + 1);
  };
  for (const r of ramas) {
    lineas.push(`${r.dominio}${r.activo ? "" : " (sin activo de dominio)"}`);
    for (const h of r.hijos) nodo(h, 1);
  }
  return lineas;
};

/** Todos los ids del árbol, con repetidos si los hubiera. */
const ids = (ramas) => {
  const salida = [];
  const nodo = (x) => { salida.push(x.activo.id); x.hijos.forEach(nodo); };
  for (const r of ramas) {
    if (r.activo) salida.push(r.activo.id);
    r.hijos.forEach(nodo);
  }
  return salida;
};

test("1. arma dominio, subdominio, IP y servicio en el orden de la API", () => {
  // Por tipo como la API y, dentro de un tipo, en el orden en que llegaron: aquí el servicio :443 antes que el :80.
  const lista = [
    activo("acme-demo.mx", "service", "203.0.113.5:443", "203.0.113.5", "ip"),
    activo("acme-demo.mx", "ip", "203.0.113.5", "www.acme-demo.mx", "subdomain"),
    activo("acme-demo.mx", "subdomain", "api.acme-demo.mx", "acme-demo.mx", "domain"),
    activo("acme-demo.mx", "subdomain", "www.acme-demo.mx", "acme-demo.mx", "domain"),
    activo("acme-demo.mx", "domain", "acme-demo.mx"),
    activo("acme-demo.mx", "service", "203.0.113.5:80", "203.0.113.5", "ip"),
  ];
  const ramas = armarArbol(lista);
  assert.deepEqual(forma(ramas), [
    "acme-demo.mx",
    "  api.acme-demo.mx",
    "  www.acme-demo.mx",
    "    203.0.113.5",
    "      203.0.113.5:443",
    "      203.0.113.5:80",
  ]);
  assert.equal(ramas[0].activo.value, "acme-demo.mx");
  assert.equal(ramas[0].descendientes, 5);
  assert.equal(ramas[0].hijos[1].descendientes, 3);
});

test("2. un activo sin padre cuelga del dominio y uno con el padre faltante sale suelto", () => {
  const ramas = armarArbol([
    activo("acme-demo.mx", "email", "ti@acme-demo.mx"),
    activo("acme-demo.mx", "subdomain", "mail.acme-demo.mx", "acme-demo.mx", "domain"),
    activo("acme-demo.mx", "service", "198.51.100.7:25", "198.51.100.7", "ip"),
  ]);
  // Sin el activo 'domain' en la lista (por ejemplo, con el filtro de tipo), el subdominio cuelga del dominio igual:
  // su padre es el propio dominio y la raíz lo representa.
  assert.deepEqual(forma(ramas), [
    "acme-demo.mx (sin activo de dominio)",
    "  mail.acme-demo.mx",
    "  198.51.100.7:25 [padre_fuera]",
    "  ti@acme-demo.mx",
  ]);
  assert.equal(textoSuelto("padre_fuera", "198.51.100.7"),
    "Suelto: su padre 198.51.100.7 no está en esta vista (filtros o tope del árbol).");
});

test("3. un ciclo no rompe el árbol: sus activos salen sueltos y nada se repite ni se pierde", () => {
  const lista = [
    activo("acme-demo.mx", "domain", "acme-demo.mx"),
    activo("acme-demo.mx", "subdomain", "a.acme-demo.mx", "b.acme-demo.mx", "subdomain"),
    activo("acme-demo.mx", "subdomain", "b.acme-demo.mx", "a.acme-demo.mx", "subdomain"),
    activo("acme-demo.mx", "ip", "192.0.2.10", "b.acme-demo.mx", "subdomain"),
    activo("acme-demo.mx", "ip", "192.0.2.99", "192.0.2.99", "ip"),
    activo("acme-demo.mx", "service", "192.0.2.10:22", "192.0.2.10", "ip"),
  ];
  const ramas = armarArbol(lista);
  assert.deepEqual(forma(ramas), [
    "acme-demo.mx",
    "  a.acme-demo.mx [ciclo]",
    "  b.acme-demo.mx [ciclo]",
    "    192.0.2.10",
    "      192.0.2.10:22",
    "  192.0.2.99 [ciclo]",
  ]);
  assert.deepEqual(ids(ramas).sort(), lista.map((a) => a.id).sort());
  assert.equal(ramas[0].descendientes, lista.length - 1);
});

test("4. un padre que solo existe en otro dominio deja al activo suelto en el suyo", () => {
  const ramas = armarArbol([
    activo("acme-demo.mx", "ip", "192.0.2.1", "www.acme-demo.mx", "subdomain"),
    activo("acme-tienda.mx", "service", "192.0.2.1:443", "192.0.2.1", "ip"),
    activo("acme-tienda.mx", "domain", "acme-tienda.mx"),
  ]);
  assert.deepEqual(forma(ramas), [
    "acme-demo.mx (sin activo de dominio)",
    "  192.0.2.1 [padre_fuera]",
    "acme-tienda.mx",
    "  192.0.2.1:443 [otro_dominio]",
  ]);
  assert.equal(textoSuelto("otro_dominio", "192.0.2.1"), "Suelto: su padre 192.0.2.1 es de otro dominio.");
});

test("5. dos páginas que se enciman no repiten un activo y la lista vacía da un árbol vacío", () => {
  const ip = activo("acme-demo.mx", "ip", "192.0.2.1");
  assert.equal(ids(armarArbol([ip, ip, { ...ip }])).length, 1);
  assert.deepEqual(armarArbol([]), []);
});

test("6. con muchos activos el árbol abre cerrado y trae los activos en peticiones de 200, hasta el tope", () => {
  assert.equal(abreAbierto(ABRE_ABIERTO_HASTA), true);
  assert.equal(abreAbierto(ABRE_ABIERTO_HASTA + 1), false);
  assert.deepEqual(consultasArbol("domain=acme-demo.mx&type=ip", 1), [
    `domain=acme-demo.mx&type=ip&limit=${POR_PETICION_ARBOL}&offset=0`,
  ]);
  assert.equal(consultasArbol("", 0).length, 1);
  assert.equal(consultasArbol("", 401).length, 3);
  const tope = consultasArbol("q=www", 1_000_000);
  assert.equal(tope.length, MAX_ARBOL / POR_PETICION_ARBOL);
  assert.equal(tope.at(-1), `q=www&limit=${POR_PETICION_ARBOL}&offset=${MAX_ARBOL - POR_PETICION_ARBOL}`);
});

test("7. la vista va en la URL junto a los mismos filtros", () => {
  assert.equal(leerVista("arbol"), "arbol");
  for (const v of [undefined, "", "lista", "ARBOL", ["arbol", "arbol"]]) assert.equal(leerVista(v), "lista", String(v));
  assert.equal(conVista("?dominio=acme-demo.mx&tipo=ip", "arbol"), "?dominio=acme-demo.mx&tipo=ip&vista=arbol");
  assert.equal(conVista("?dominio=acme-demo.mx&vista=arbol", "lista"), "?dominio=acme-demo.mx");
  assert.equal(conVista("", "arbol"), "?vista=arbol");
  assert.equal(conVista("", "lista"), "");
});

test("1b. dentro de un tipo y entre dominios se queda el orden de la API, con su collation", () => {
  // La API ordena con la collation de la base: api, apib, api-v2 (el guion no cuenta en el primer nivel). Un '<'
  // pondría api-v2 antes que apib. Los dominios también llegan ordenados por la API (b-uno.mx antes que b.mx).
  const ramas = armarArbol([
    activo("b-uno.mx", "domain", "b-uno.mx"),
    activo("b.mx", "domain", "b.mx"),
    activo("b.mx", "subdomain", "api.b.mx", "b.mx", "domain"),
    activo("b.mx", "subdomain", "apib.b.mx", "b.mx", "domain"),
    activo("b.mx", "subdomain", "api-v2.b.mx", "b.mx", "domain"),
  ]);
  assert.deepEqual(forma(ramas), ["b-uno.mx", "b.mx", "  api.b.mx", "  apib.b.mx", "  api-v2.b.mx"]);
});

test("5b. las páginas cuadran solo con el mismo total y sin repetidos ni faltantes", () => {
  const ids200 = Array.from({ length: 200 }, (_, i) => `id-${i}`);
  assert.equal(paginasCuadran([250, 250], [...ids200, ...ids200.slice(0, 50).map((x) => `${x}b`)]), true);
  // Un activo nuevo entre la página 1 y la 2: la 2 repite el último de la 1 y el total sube.
  assert.equal(paginasCuadran([250, 251], [...ids200, "id-199", ...ids200.slice(0, 50).map((x) => `${x}b`)]), false);
  // Mismo total, pero la página 2 repite uno y se salta otro.
  assert.equal(paginasCuadran([250, 250], [...ids200, "id-199", ...ids200.slice(0, 49).map((x) => `${x}b`)]), false);
  assert.equal(paginasCuadran([0], []), true);
  assert.equal(paginasCuadran([MAX_ARBOL + 5], Array.from({ length: MAX_ARBOL }, (_, i) => `x${i}`)), true);
});

test("5c. al navegador solo van los campos del árbol", () => {
  const completo = { ...activo("acme-demo.mx", "ip", "192.0.2.9"), attributes: { asn: 1 }, first_seen_at: "x", ip: "192.0.2.9" };
  assert.deepEqual(Object.keys(soloArbol(completo)).sort(), ["domain", "id", "parent", "parent_type", "type", "value"]);
});

test("8. la pantalla monta los hijos de un nodo solo al abrirlo y conserva los filtros al cambiar de vista", () => {
  const arbol = leer("../components/screens/activos/AssetsTree.tsx");
  assert.match(arbol, /aria-expanded=\{abierto\}/);
  assert.match(arbol, /\{abierto && hijos\.length > 0 && \(/);
  // El botón no cambia de nombre al abrir: el estado lo dice aria-expanded. El motivo del suelto se ve en la fila.
  assert.match(arbol, /aria-label=\{`Activos debajo de \$\{nombre\}`\}/);
  assert.doesNotMatch(arbol, /title=\{textoSuelto/);
  assert.match(arbol, /<span className="text-xs text-lt-amber">\{textoSuelto\(suelto, activo\.parent\)\}<\/span>/);
  const pagina = leer("../app/(dashboard)/dashboard/activos/page.tsx");
  assert.match(pagina, /const hrefVista = \(v: Vista\) => `\/dashboard\/activos\$\{conVista\(urlFiltros\(\{ \.\.\.filtros, pagina: 1 \}\), v\)\}`/);
  assert.match(pagina, /<SelectorVista vista=\{vista\} href=\{hrefVista\} \/>/);
  const selector = leer("../components/screens/activos/SelectorVista.tsx");
  assert.match(selector, /aria-current=\{vista === value \? "page" : undefined\}/);
  // Una petición que falla no tumba la pantalla, una lista que cambió se pide otra vez y solo van los campos del árbol.
  assert.match(pagina, /Promise\.allSettled\(/);
  assert.match(pagina, /if \(cambio && intento === 1\) continue;/);
  assert.match(pagina, /activos: items\.map\(soloArbol\)/);
  const inventario = leer("../components/screens/activos/AssetsInventory.tsx");
  assert.match(inventario, /conVista\(urlFiltros\(\{ dominio, tipo, texto: texto\.trim\(\)\.slice\(0, 200\), pagina: 1 \}\), vista\)/);
  // Lo abierto del árbol vuelve al inicio al cambiar los filtros.
  assert.match(inventario, /<AssetsTree key=\{clave\} activos=\{arbol\.activos\}/);
  assert.match(inventario, /\{arbol\.cambio && \(/);
  assert.match(inventario, /\{arbol\.fallidas > 0 \? \(/);
});
