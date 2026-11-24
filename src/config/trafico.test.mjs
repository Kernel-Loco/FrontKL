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
  assert.ok(TRAFICO.queEs.includes("son de LowTide"));
  assert.ok(TRAFICO.cuando.includes("carta de autorización vigente"));
  assert.ok(TRAFICO.cuando.includes("una a la vez por sitio"));
  assert.equal(TRAFICO.correo, "seguridad@lowtidesec.com");
  assert.ok(TRAFICO.contactoAntes.endsWith("escribe a "));
});

test("la página Seguridad muestra la sección con el correo como enlace", () => {
  const pagina = readFileSync(new URL("../app/seguridad/page.tsx", import.meta.url), "utf8");
  for (const campo of ["id", "titulo", "agente", "queEs", "cuando", "contactoAntes", "correo", "contactoDespues"]) {
    assert.ok(pagina.includes(`TRAFICO.${campo}`), campo);
  }
  assert.ok(pagina.includes("href={`mailto:${TRAFICO.correo}`}"));
});

test("no trae claves de Jira, números de PR ni el nombre clave", () => {
  for (const [llave, texto] of Object.entries(TRAFICO)) {
    assert.ok(!/RC-\d|#\d|\bPR\s*\d|cirdan/i.test(texto), llave);
  }
});
