// Pruebas sin red del aviso de privacidad y de los términos de uso (RC-271). Node 22.18 o más nuevo:
//   npm test
// La 3 corre el proxy de verdad: un hook resuelve el alias @/ y next/server, que Node no conoce solo.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import * as LEGAL from "./legal.ts";

const { ARCO, AVISO_INTEGRAL, AVISO_SIMPLIFICADO, POLITICA, TERMINOS } = LEGAL;

// Huella de los textos copiados de las secciones 5.2, 5.7 y 11 de la política 2.6 del 24 nov 2026 de BackKL.
const HUELLA_DE_LA_POLITICA = "d5a6506c83b14cee6d3b9472342fc2607854c6adaed021054745efbcb224b04f";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. trae los 8 puntos del aviso, las 2 filas y los 6 pasos ARCO y los 8 términos, con versión y fecha", () => {
  assert.equal(AVISO_INTEGRAL.puntos.length, 8);
  AVISO_INTEGRAL.puntos.slice(0, 6).forEach((punto, i) => {
    assert.match(punto.texto, new RegExp(`\\(fracción ${["I", "II", "III", "IV", "V", "VI"][i]}\\):`));
  });
  assert.equal(ARCO.columnas.length, 3);
  assert.equal(ARCO.filas.length, 2);
  for (const fila of ARCO.filas) assert.equal(fila.length, 3);
  assert.equal(ARCO.pasos.length, 6);
  assert.equal(TERMINOS.puntos.length, 8);
  assert.match(POLITICA.version, /^\d+\.\d+$/);
  assert.match(POLITICA.fecha, /^\d{1,2} [a-z]{3} \d{4}$/);
  assert.match(AVISO_INTEGRAL.simplificadoTitulo, /\(art\. 16, fracción II\):$/);
  assert.equal(AVISO_SIMPLIFICADO.url, "https://lowtidesec.com/privacidad");
  assert.match(AVISO_SIMPLIFICADO.despues, /arco@lowtidesec\.com/);
});

test("2. los textos son la copia de la política: nadie los edita a mano", () => {
  const huella = createHash("sha256").update(JSON.stringify(LEGAL)).digest("hex");
  assert.equal(
    huella,
    HUELLA_DE_LA_POLITICA,
    "legal.ts ya no es la copia de la política. Cópialo de nuevo de las secciones 5.2, 5.7 y 11 vigentes y " +
      "actualiza la versión, la fecha y esta huella.",
  );
});

test("3. /privacidad y /terminos se abren sin sesión: el proxy las deja pasar", async () => {
  registerHooks({
    resolve(especificador, contexto, siguiente) {
      if (especificador.startsWith("@/")) {
        return siguiente(new URL(`../${especificador.slice(2)}.ts`, import.meta.url).href, contexto);
      }
      if (especificador === "next/server") return siguiente("next/server.js", contexto);
      return siguiente(especificador, contexto);
    },
  });
  const { NextRequest } = await import("next/server.js");
  const { config, proxy } = await import("../proxy.ts");
  const pedir = (ruta) => proxy(new NextRequest(new URL(ruta, "http://localhost:3000")));

  for (const ruta of ["/privacidad", "/terminos"]) {
    const respuesta = pedir(ruta);
    assert.equal(respuesta.headers.get("x-middleware-next"), "1", `${ruta} no pasa sin sesión`);
    assert.equal(respuesta.headers.get("location"), null, `${ruta} redirige sin sesión`);
    // Desde RC-89 el proxy pasa por toda página para ponerle la CSP (la regla con source), pero ninguna ruta de
    // sesión es de las legales: arriba se ve que pasan sin redirigir.
    for (const patron of config.matcher.filter((p) => typeof p === "string")) {
      assert.ok(!patron.startsWith(ruta), `el proxy intercepta ${ruta}`);
    }
    assert.match(respuesta.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  }
  // Control: el panel sí manda al login sin sesión, así que la prueba de arriba distingue.
  assert.match(pedir("/dashboard").headers.get("location") ?? "", /\/login$/);
});

test("4. las dos páginas no piden sesión ni redirigen", () => {
  for (const ruta of ["../app/privacidad/page.tsx", "../app/terminos/page.tsx", "../components/legal/PaginaLegal.tsx"]) {
    const codigo = leer(ruta);
    assert.doesNotMatch(codigo, /getServerSession|lib\/session|next\/navigation|next\/headers|redirect\(/, ruta);
  }
  assert.match(leer("../app/privacidad/page.tsx"), /<PaginaLegal [^>]*titulo=\{AVISO_INTEGRAL\.titulo\}/);
  assert.match(leer("../app/terminos/page.tsx"), /<PaginaLegal [^>]*titulo=\{TERMINOS\.titulo\}/);
});

test("5. el login y el alta traen el aviso simplificado y los enlaces a /privacidad y /terminos", () => {
  // /login y /signup están en el grupo (auth), así que los dos usan este layout.
  for (const ruta of ["../app/(auth)/login/page.tsx", "../app/(auth)/signup/page.tsx"]) leer(ruta);
  const layout = leer("../app/(auth)/layout.tsx");
  assert.match(layout, /<AvisoSimplificado\b/);
  assert.match(layout, /<Link href="\/privacidad"/);
  assert.match(layout, /Al iniciar sesión aceptas los(\{" "\}| )\s*<Link href="\/terminos"/);
  assert.match(leer("../components/legal/AvisoSimplificado.tsx"), /<Link href="\/privacidad"/);
});

test("6. el pie del panel enlaza las dos páginas", () => {
  const panel = leer("../components/dashboard/DashboardShell.tsx");
  assert.match(panel, /<Link href="\/privacidad"/);
  assert.match(panel, /<Link href="\/terminos"/);
});
