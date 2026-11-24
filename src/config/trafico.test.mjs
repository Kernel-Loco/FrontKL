// La sección 'Tráfico de LowTide' de la página Seguridad: el User-Agent de LowTide liga a esta página, que tiene que
// decir qué es LowTide y a quién escribir (BackKL, constante AGENTE de los recolectores y sección 9 de la carta).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TRAFICO } from "./trafico.ts";

test("el User-Agent es el de la carta y liga a esta página", () => {
  assert.equal(TRAFICO.agente, "lowtide-osint/<versión> (+https://lowtidesec.com/seguridad)");
  assert.equal(TRAFICO.id, "trafico");
});

test("dice qué es LowTide y a quién escribir", () => {
  assert.ok(TRAFICO.queEs.includes("User-Agent de LowTide"));
  assert.ok(TRAFICO.queEs.includes("Cualquiera puede copiar un User-Agent"));
  assert.ok(TRAFICO.queEs.includes("IP de origen"));
  assert.ok(TRAFICO.queEs.includes("sección 9 de la carta"));
  assert.ok(TRAFICO.cuando.includes("carta de autorización vigente"));
  assert.ok(TRAFICO.cuando.includes("una a la vez por sitio"));
  assert.ok(TRAFICO.cuando.includes("también entre análisis distintos"));
  assert.ok(TRAFICO.cuando.includes("tope por análisis que dice la carta"));
  assert.ok(TRAFICO.cuando.includes("Dentro de cada análisis deja una pausa de 1 segundo"));
  assert.ok(TRAFICO.contactoDespues.includes("la IP de origen"));
  assert.ok(TRAFICO.contactoDespues.includes("si lo pide el contacto de tu empresa que nombra la carta"));
});

test("es el aviso simplificado de quien escribe: responsable, finalidad, ARCO y liga al integral", () => {
  assert.ok(TRAFICO.privacidadAntes.includes("Solo usamos tu correo y lo que mandes para revisar ese tráfico y responderte"));
  assert.ok(TRAFICO.privacidadAntes.includes("El responsable de esos datos es [Titular por definir según el convenio Tec e IKUSI]"));
  assert.ok(TRAFICO.privacidadAntes.endsWith("derechos ARCO, escribe a "));
  assert.equal(TRAFICO.arco, "arco@lowtidesec.com");
  assert.equal(TRAFICO.avisoRuta, "/privacidad");
  assert.equal(TRAFICO.correo, "seguridad@lowtidesec.com");
  assert.ok(TRAFICO.contactoAntes.endsWith("escribe a "));
});

test("la página Seguridad muestra la sección con los correos y el aviso como enlaces", () => {
  const pagina = readFileSync(new URL("../app/seguridad/page.tsx", import.meta.url), "utf8");
  for (const campo of Object.keys(TRAFICO)) {
    assert.ok(pagina.includes(`TRAFICO.${campo}`), campo);
  }
  assert.ok(pagina.includes("href={`mailto:${TRAFICO.correo}`}"));
  assert.ok(pagina.includes("href={`mailto:${TRAFICO.arco}`}"));
  assert.ok(pagina.includes("href={TRAFICO.avisoRuta}"));
});

test("no trae claves de Jira, números de PR ni el nombre clave", () => {
  for (const [llave, texto] of Object.entries(TRAFICO)) {
    assert.ok(!/RC-\d|#\d|\bPR\s*\d|cirdan/i.test(texto), llave);
  }
});
