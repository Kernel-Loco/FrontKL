// Pruebas sin red del escape de CSV (#24, RC-57). Node 22.18 o más nuevo, que quita los tipos de csv.ts:
//   node --test src/lib/csv.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { csvCell, toCsv } from "./csv.ts";

test("cada inicio de fórmula lleva comilla y el texto normal no cambia", () => {
  for (const start of ["=", "+", "-", "@", "\t", "\r"]) {
    assert.equal(csvCell(`${start}SUM(A1)`).replace(/^"|"$/g, ""), `'${start}SUM(A1)`);
  }
  assert.equal(csvCell("acme.mx"), "acme.mx");
  assert.equal(csvCell("a=b"), "a=b");
  assert.equal(csvCell(-5), "-5");
  assert.equal(csvCell(null), "");
});

test("lo que sigue a ';', tabulador o salto de línea lleva comilla y la celda va entre comillas", () => {
  assert.equal(csvCell("x;=cmd|' /C calc'!A0"), "\"x;'=cmd|' /C calc'!A0\"");
  assert.equal(csvCell("a\t+1;-2\n@3"), "\"a\t'+1;'-2\n'@3\"");
  assert.equal(csvCell(";\t=x"), "\";'\t'=x\"");
  assert.equal(csvCell("a; b;c"), "\"a; b;c\"");
  assert.equal(csvCell("x;\"=cmd"), "\"x;'\"\"=cmd\"");
  assert.equal(csvCell("a\tb"), "\"a\tb\"");
  assert.equal(csvCell({ banner: "x;=1" }), "\"{\"\"banner\"\":\"\"x;'=1\"\"}\"");
});

test("ningún pedazo partido en ';' o tabulador empieza con un inicio de fórmula", () => {
  const text = toCsv([{ titulo: "x;=cmd|' /C calc'!A0", n: 1 }, { titulo: "a\t-b", n: -2 }, { titulo: "x;\"=cmd", n: 3 }]);
  assert.ok(text.startsWith("﻿"));
  for (const piece of text.slice(1).split(/[;\t]/)) {
    assert.ok(!/^"*[=+\-@]/.test(piece), JSON.stringify(piece));
  }
});
