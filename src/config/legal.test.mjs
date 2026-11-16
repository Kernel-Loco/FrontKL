// Pruebas sin red de los textos del aviso de privacidad y los términos de uso. Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { PRIVACIDAD, TERMINOS } from "./legal.ts";

const raiz = new URL("../../", import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), "utf8");

/** Todos los textos del objeto, con el camino de cada uno. */
function textos(valor, camino) {
  if (typeof valor === "string") return [[camino, valor]];
  if (valor === null || typeof valor !== "object") return [];
  return Object.entries(valor).flatMap(([llave, hijo]) => textos(hijo, `${camino}.${llave}`));
}
const TODOS = [...textos(PRIVACIDAD, "PRIVACIDAD"), ...textos(TERMINOS, "TERMINOS")];

const PROHIBIDO = [
  [/RC-\d/i, "una clave de Jira"],
  [/#\d/, "un número de backlog o de PR"],
  [/\bPR\s*\d/i, "un número de PR"],
  [/cirdan/i, "el nombre clave"],
  [/\bsecci[oó]n\s+\d/i, "una referencia a una sección de un documento interno"],
  [/\[[^\]]*\]/, "un marcador entre corchetes de la política"],
  [/\b(src|cirdan|db|docs|pruebas|scripts)\/|\.(py|sql|tsx?|mjs|md|ya?ml)\b/, "una ruta del repo"],
];

test("ningún texto está vacío ni repite título", () => {
  for (const [camino, texto] of TODOS) assert.ok(texto.trim().length > 0, camino);
  for (const doc of [PRIVACIDAD, TERMINOS]) {
    assert.equal(new Set(doc.apartados.map((a) => a.titulo)).size, doc.apartados.length, doc.titulo);
  }
});

test("no traen claves de Jira, números, rutas, secciones internas ni marcadores", () => {
  for (const [camino, texto] of TODOS) {
    for (const [patron, que] of PROHIBIDO) assert.ok(!patron.test(texto), `${camino} trae ${que}`);
  }
});

test("el aviso trae lo que pide la ley: responsable, datos, finalidades, ARCO, revocación y cambios", () => {
  const titulos = PRIVACIDAD.apartados.map((a) => a.titulo);
  for (const t of ["Quién es el responsable", "Qué datos se tratan", "Para qué se usan", "Tus derechos ARCO", "Cómo revocar tu consentimiento", "Cambios a este aviso"]) {
    assert.ok(titulos.includes(t), `falta el apartado ${t}`);
  }
  assert.match(PRIVACIDAD.simplificado, /arco@lowtidesec\.com/);
  assert.match(textos(PRIVACIDAD, "P").map(([, t]) => t).join(" "), /20 días hábiles/);
});

test("el producto se llama LowTide", () => {
  for (const [camino, texto] of TODOS) {
    for (const nombre of texto.match(/lowtide/gi) ?? []) {
      if (/@lowtidesec\.com/i.test(texto) && nombre === "lowtide") continue;
      assert.equal(nombre, "LowTide", camino);
    }
  }
});

test("las páginas existen, no pasan por el proxy y se enlazan desde el login y el portal", () => {
  for (const ruta of ["src/app/privacidad/page.tsx", "src/app/terminos/page.tsx"]) assert.ok(existsSync(new URL(ruta, raiz)), ruta);
  const proxy = leer("src/proxy.ts");
  const matcher = proxy.slice(proxy.indexOf("matcher"));
  assert.ok(!/privacidad|terminos/.test(matcher), "el proxy no debe interceptar /privacidad ni /terminos");
  for (const archivo of ["src/app/(auth)/layout.tsx", "src/components/dashboard/DashboardShell.tsx"]) {
    const codigo = leer(archivo);
    for (const href of ['href="/privacidad"', 'href="/terminos"']) assert.ok(codigo.includes(href), `${archivo} sin ${href}`);
  }
});
