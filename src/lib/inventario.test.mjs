// Pruebas sin red de la comparación con el inventario del cliente (#146, RC-264). Node 22.18 o más nuevo:
//   node --test src/lib/inventario.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { toCsv } from "./csv.ts";
import {
  compararInventario,
  filasDesconocidos,
  InventarioError,
  leerInventario,
  llaveDelActivo,
  MAX_FILAS,
  normalizarValor,
  partirCsv,
  separadorDe,
} from "./inventario.ts";

const activo = (id, type, value, parent = null, attributes = {}) => ({
  id, type, value, parent, attributes, first_seen_at: "2026-11-01T10:00:00Z", last_seen_at: "2026-11-15T10:00:00Z",
});

test("normaliza minúsculas, espacios, punto final y punycode", () => {
  assert.deepEqual(normalizarValor("  WWW.Acme-Demo.MX.  "), { valor: "www.acme-demo.mx", clase: "fqdn", comodin: false });
  assert.equal(normalizarValor("Ñandú.mx")?.valor, "xn--and-6ma2c.mx");
  assert.equal(normalizarValor("_dmarc.acme.mx")?.valor, "_dmarc.acme.mx");
});

test("IPv4 e IPv6 quedan en forma canónica", () => {
  assert.equal(normalizarValor("198.51.100.10")?.valor, "198.51.100.10");
  assert.equal(normalizarValor("2001:0DB8:0000:0000:0000:0000:0000:0001")?.valor, "2001:db8::1");
  assert.equal(normalizarValor("[2001:db8::1]")?.valor, "2001:db8::1");
  assert.equal(normalizarValor("2001:db8:0:0:1:0:0:1")?.valor, "2001:db8::1:0:0:1");
  assert.equal(normalizarValor("2001:db8:0:1:1:1:1:1")?.valor, "2001:db8:0:1:1:1:1:1");
  assert.equal(normalizarValor("0:0:0:0:0:0:0:0")?.valor, "::");
  assert.equal(normalizarValor("::ffff:192.0.2.1")?.valor, normalizarValor("0:0:0:0:0:ffff:c000:0201")?.valor);
  assert.equal(normalizarValor("198.51.100.10")?.clase, "ip");
});

test("lo que no es FQDN ni IP no se normaliza", () => {
  for (const malo of ["", "   ", "localhost", "256.1.1.1", "01.2.3.4", "1.2.3", "1.2.3.999", "-a.mx", "a-.mx", "a..mx",
    "a b.mx", "https://acme.mx", "acme.mx/ruta", "acme.mx:443", "10.0.0.0/24", "1::2::3", "1:2:3:4:5:6:7:8:9", "fe80::1%eth0",
    "<img src=x onerror=alert(1)>.mx", "ñ.mx/ruta", "=cmd|' /C calc'!A0", `${"a".repeat(64)}.mx`, "*.", "*.mx", "a.*.mx"]) {
    assert.equal(normalizarValor(malo), null, malo);
  }
});

test("*.dominio cubre sus subdominios a cualquier profundidad, no al dominio", () => {
  const { entradas } = leerInventario("valor\n*.acme.mx\n");
  assert.deepEqual(entradas, [{ valor: "acme.mx", clase: "fqdn", comodin: true }]);
  const r = compararInventario([
    activo("1", "subdomain", "www.acme.mx"),
    activo("2", "subdomain", "a.b.acme.mx"),
    activo("3", "domain", "acme.mx"),
    activo("4", "subdomain", "noacme.mx"),
  ], entradas);
  assert.deepEqual([...r.estados.values()], ["inventario", "inventario", "desconocido", "desconocido"]);
  assert.deepEqual(r.noVistos, []);
});

test("cuenta y salta filas inválidas y duplicadas, con encabezado, ';' y BOM", () => {
  const texto = "﻿Tipo;Valor\r\nsubdominio;WWW.acme.mx.\r\nip;198.51.100.10\r\nip;www.acme.mx\r\n;no es nada\r\n\r\n;www.acme.mx\r\nfqdn;\"api.acme.mx\"\r\n";
  const r = leerInventario(texto);
  assert.deepEqual(r.entradas.map((e) => e.valor), ["www.acme.mx", "198.51.100.10", "api.acme.mx"]);
  assert.equal(r.invalidas, 2);
  assert.equal(r.duplicadas, 1);
});

test("sin encabezado la primera columna es el valor y la segunda el tipo", () => {
  const r = leerInventario("www.acme.mx,subdominio\n198.51.100.10,fqdn\n2001:db8::1\n");
  assert.deepEqual(r.entradas.map((e) => e.valor), ["www.acme.mx", "2001:db8::1"]);
  assert.equal(r.invalidas, 1);
});

test("el tope es de 5,000 filas y 1 MB", () => {
  const filas = (n) => `valor\n${Array.from({ length: n }, (_, i) => `h${i}.acme.mx`).join("\n")}\n`;
  assert.equal(leerInventario(filas(MAX_FILAS)).entradas.length, MAX_FILAS);
  assert.throws(() => leerInventario(filas(MAX_FILAS + 1)), InventarioError);
  assert.throws(() => leerInventario(`valor\n${"a".repeat(1024 * 1024)}`), InventarioError);
  assert.throws(() => leerInventario("\n\n  \n"), InventarioError);
});

test("cada activo queda en inventario o desconocido y se lista lo que LowTide no vio", () => {
  const { entradas } = leerInventario("valor\nwww.acme.mx\n198.51.100.10\nviejo.acme.mx\n*.interno.acme.mx\n");
  const assets = [
    activo("1", "subdomain", "WWW.ACME.MX"),
    activo("2", "ip", "198.51.100.10", "www.acme.mx"),
    activo("3", "service", "198.51.100.10:443/tcp", "198.51.100.10"),
    activo("4", "certificate", "9f2c4e7a", "www.acme.mx", { subject: "www.acme.mx" }),
    activo("5", "subdomain", "dev.acme.mx"),
    activo("6", "service", "[2001:db8::1]:22/tcp"),
    activo("7", "email", "ti@acme.mx"),
  ];
  const r = compararInventario(assets, entradas);
  assert.deepEqual(Object.fromEntries(r.estados), {
    1: "inventario", 2: "inventario", 3: "inventario", 4: "inventario", 5: "desconocido", 6: "desconocido", 7: "desconocido",
  });
  assert.equal(r.enInventario, 4);
  assert.equal(r.desconocidos, 3);
  assert.deepEqual(r.noVistos, ["viejo.acme.mx", "*.interno.acme.mx"]);
  assert.equal(llaveDelActivo(assets[5]), "2001:db8::1");
  assert.equal(llaveDelActivo(activo("8", "certificate", "abc", null, { subject: "Api.Acme.mx" })), "api.acme.mx");
});

test("una documentación de API (api_doc) se compara por el host de su URL", () => {
  const { entradas } = leerInventario("valor\napi.acme.mx\n198.51.100.10\n2001:db8::1\n");
  const assets = [
    activo("1", "api_doc", "https://API.acme.mx/swagger.json", "api.acme.mx"),
    activo("2", "api_doc", "https://198.51.100.10:8443/openapi.json"),
    activo("3", "api_doc", "https://[2001:db8::1]/v2/api-docs"),
    activo("4", "api_doc", "https://dev.acme.mx/openapi.yaml"),
    activo("5", "api_doc", "no es una URL"),
  ];
  const r = compararInventario(assets, entradas);
  assert.deepEqual(Object.fromEntries(r.estados), { 1: "inventario", 2: "inventario", 3: "inventario", 4: "desconocido", 5: "desconocido" });
  assert.equal(llaveDelActivo(activo("6", "api_doc", "https://ñandú.mx/docs")), "xn--and-6ma2c.mx");
  assert.equal(llaveDelActivo(assets[4]), null);
});

test("un CSV con solo el encabezado lanza InventarioError", () => {
  for (const texto of ["valor\n", "Tipo;Valor\r\n\r\n", "﻿fqdn,tipo"]) {
    assert.throws(() => leerInventario(texto), (e) => e instanceof InventarioError && /encabezado/.test(e.message), JSON.stringify(texto));
  }
});

test("una comilla sin cerrar no se traga el resto del archivo", () => {
  const filas = Array.from({ length: 3000 }, (_, i) => `h${i}.acme.mx`).join("\n");
  const r = leerInventario(`valor\n"roto.acme.mx\n${filas}\n`);
  assert.equal(r.entradas.length, 3000);
  assert.equal(r.invalidas, 1);
  assert.deepEqual(partirCsv('a,"b\nc,d\n', ","), [["a", '"b'], ["c", "d"]]);
  // Una comilla cerrada sigue juntando líneas, como pide RFC 4180.
  assert.deepEqual(partirCsv('a,"b\nc",d\n', ","), [["a", "b\nc", "d"]]);
});

test("una comilla después de espacios abre comillas", () => {
  assert.deepEqual(partirCsv('  "a,b" ,c\n', ","), [["a,b ", "c"]]);
  const r = leerInventario('valor,tipo\n  "www.acme.mx" ,fqdn\n');
  assert.deepEqual(r.entradas.map((e) => e.valor), ["www.acme.mx"]);
  assert.equal(r.invalidas, 0);
});

test("el separador no cuenta los que van entre comillas", () => {
  assert.equal(separadorDe('"a,b,c,d";tipo\nx;y\n'), ";");
  assert.equal(separadorDe('valor\ttipo\t"x,y,z"\n'), "\t");
  assert.equal(separadorDe("valor,tipo\n"), ",");
  assert.equal(separadorDe("valor\n"), ",");
  const r = leerInventario('"Valor, del activo";Tipo\nwww.acme.mx;fqdn\n198.51.100.10;ip\n');
  assert.deepEqual(r.entradas.map((e) => e.valor), ["www.acme.mx", "198.51.100.10"]);
  // Con la comilla del encabezado sin cerrar, cuenta la primera línea como partirCsv: sin comillas.
  assert.equal(separadorDe('"valor;tipo\nx.acme.mx;fqdn\n'), ";");
  assert.equal(leerInventario('"valor;tipo\nx.acme.mx;fqdn\n').entradas.length, 1);
});

test("unas comillas cerradas no dejan que otra comilla tras espacios borre la celda", () => {
  assert.deepEqual(partirCsv('"  " "b",c\n', ","), [['   "b"', "c"]]);
});

test("muchas comillas en medio de una celda larga no vuelven cuadrática la lectura", () => {
  const inicio = performance.now();
  partirCsv(`a${'"'.repeat(400000)}`, ",");
  leerInventario(`www.acme.mx,"${'x"'.repeat(100000)}`);
  // Con la regex sobre la celda tardaba unos 24 s. Lineal tarda milisegundos: el tope es holgado a propósito.
  assert.ok(performance.now() - inicio < 2000);
});

test("el CSV de desconocidos lleva comilla antes de =, +, - y @", () => {
  const assets = [activo("1", "subdomain", "=cmd|' /C calc'!A0"), activo("2", "subdomain", "+x"), activo("3", "subdomain", "-x"),
    activo("4", "subdomain", "@x"), activo("5", "subdomain", "www.acme.mx")];
  const r = compararInventario(assets, leerInventario("valor\nwww.acme.mx\n").entradas);
  const filas = filasDesconocidos(assets, r.estados);
  assert.equal(filas.length, 4);
  const lineas = toCsv(filas).slice(1).split("\r\n");
  assert.equal(lineas[0], "valor,tipo,pertenece_a,visto_por_ultima_vez");
  assert.deepEqual(lineas.slice(1).map((l) => l.split(",")[0]), ["'=cmd|' /C calc'!A0", "'+x", "'-x", "'@x"]);
});

test("el comparador no manda ni guarda el archivo y no lo pinta como HTML", () => {
  const fuente = readFileSync(new URL("../components/screens/detalle/ComparadorInventario.tsx", import.meta.url), "utf8");
  for (const prohibido of ["fetch(", "XMLHttpRequest", "sendBeacon", "localStorage", "sessionStorage", "indexedDB", "document.cookie", "dangerouslySetInnerHTML", "innerHTML", "@/services"]) {
    assert.ok(!fuente.includes(prohibido), prohibido);
  }
});
