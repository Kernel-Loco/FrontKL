// Pruebas sin red del nombre visible (#96e, RC-205). Node 22.18 o más nuevo:
//   node --test src/lib/marca.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const SRC = join(import.meta.dirname, "..");

function archivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

test("ningún archivo de src/ escribe el nombre como 'Lowtide'", () => {
  const malos = archivos(SRC).flatMap((ruta) =>
    readFileSync(ruta, "utf8")
      .split("\n")
      .flatMap((linea, i) => (/Lowtide/.test(linea) ? [`${ruta}:${i + 1}`] : [])),
  );
  assert.deepEqual(malos, []);
});

test("la pestaña, el enlace de la barra y el PDF ejecutivo dicen LowTide", () => {
  const leer = (r) => readFileSync(join(SRC, r), "utf8");
  assert.match(leer("app/layout.tsx"), /default: "LowTide", template: "%s · LowTide"/);
  assert.match(leer("components/Sidebar.tsx"), /aria-label="LowTide, ir al dashboard"/);
  const pdf = leer("components/screens/historico/ExecutiveReportDownload.tsx");
  assert.match(pdf, /title: "Resumen ejecutivo de riesgo - LowTide"/);
  assert.match(pdf, /creator: "LowTide"/);
  assert.match(pdf, /`LowTide - Confidencial - /);
});
