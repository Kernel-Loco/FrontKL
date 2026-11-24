// RC-70 punto 4: el PDF sale del mismo HTML de la API. printReportHtml lo carga tal cual en un iframe sin scripts y
// abre la impresión. node --test, sin red ni navegador: un documento falso registra lo que pasa.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { exportBlockReasons } from "../components/screens/shared/domainState.ts";
import { printReportHtml, SANDBOX } from "./imprimirReporte.ts";

function documentoFalso() {
  const registro = { prints: 0, focus: 0, quitado: 0 };
  const escuchas = {};
  const win = {
    focus: () => { registro.focus += 1; },
    print: () => { registro.prints += 1; },
    addEventListener: (tipo, fn) => { escuchas[`win:${tipo}`] = fn; },
  };
  let frame;
  const doc = {
    createElement: (tag) => {
      assert.equal(tag, "iframe");
      frame = {
        attrs: {}, style: {}, srcdoc: "", contentWindow: win, tabIndex: 0,
        setAttribute(k, v) { this.attrs[k] = v; },
        addEventListener: (tipo, fn) => { escuchas[`frame:${tipo}`] = fn; },
        remove: () => { registro.quitado += 1; },
      };
      return frame;
    },
    body: { appendChild: (f) => { registro.agregado = f; } },
  };
  return { doc, registro, escuchas, frame: () => frame };
}

const HTML = "<!doctype html><html><head><title>Resumen ejecutivo de riesgo · olmardo.com · LowTide</title>"
  + "<style>@page { size: A4; margin: 14mm; }</style></head><body>Have I Been Pwned</body></html>";

test("1. carga el HTML de la API tal cual en un iframe sin scripts e imprime", async () => {
  const { doc, registro, escuchas, frame } = documentoFalso();
  const promesa = printReportHtml(HTML, doc);
  assert.equal(frame().srcdoc, HTML);  // el mismo HTML, sin rearmarlo
  assert.equal(frame().attrs.sandbox, SANDBOX);
  assert.doesNotMatch(SANDBOX, /allow-scripts/);
  assert.equal(frame().attrs["aria-hidden"], "true");
  assert.equal(registro.agregado, frame());
  assert.equal(registro.prints, 0);  // espera a que cargue
  escuchas["frame:load"]();
  const quitar = await promesa;
  assert.equal(registro.focus, 1);
  assert.equal(registro.prints, 1);
  escuchas["win:afterprint"]();  // al cerrar el diálogo se quita el iframe
  assert.equal(registro.quitado, 1);
  assert.equal(typeof quitar, "function");
});

test("2. abortado antes de cargar no imprime y quita el iframe", async () => {
  const { doc, registro, escuchas } = documentoFalso();
  const control = new AbortController();
  const promesa = printReportHtml(HTML, doc, control.signal);
  control.abort();
  escuchas["frame:load"]();
  await promesa;
  assert.equal(registro.prints, 0);
  assert.equal(registro.quitado, 1);
});

test("3. el botón de PDF y el de HTML piden el mismo HTML, y el portal ya no arma un PDF con jsPDF", () => {
  const boton = readFileSync(new URL("../components/screens/shared/ReportButton.tsx", import.meta.url), "utf8");
  assert.equal(boton.match(/downloadExecutiveHtml\(/g).length, 1);  // una sola petición para los dos formatos
  assert.match(boton, /printReportHtml\(await blob\.text\(\), document, current\.signal\)/);
  assert.match(boton, /saveBlob\(blob, `\$\{domain\}-resumen-ejecutivo\.html`\)/);
  const paquete = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(Object.keys({ ...paquete.dependencies, ...paquete.devDependencies }).some((d) => /jspdf/i.test(d)), false);
});

// Las dos de abajo venían de reporteEjecutivo.test.mjs (pruebas 6 y 7), que se borró con jsPDF.
test("4. el reporte solo se frena sin carta vigente, como la API", () => {
  assert.deepEqual(exportBlockReasons(["txt_not_verified", "domain_paused", "scan_in_progress", "live_scan_not_allowed"]), []);
  assert.deepEqual(exportBlockReasons(["authorization_expired", "scan_in_progress"]), ["authorization_expired"]);
  for (const r of ["authorization_missing", "authorization_not_started", "authorization_revoked"]) {
    assert.deepEqual(exportBlockReasons([r]), [r]);
  }
});

test("5. cada ReportButton lleva key y el detalle le pasa solo los motivos de la carta", () => {
  const src = join(import.meta.dirname, "..");
  const archivos = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.tsx$/.test(e.name) ? [join(dir, e.name)] : []);
  const usos = archivos(src).flatMap((ruta) => [...readFileSync(ruta, "utf8").matchAll(/<ReportButton\b[^>]*>/g)].map((m) => [ruta, m[0]]));
  assert.ok(usos.length >= 2, "se esperan el detalle y el histórico");
  for (const [ruta, uso] of usos) assert.match(uso, /\bkey=\{/, ruta);
  const detalle = readFileSync(join(src, "app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx"), "utf8");
  assert.doesNotMatch(detalle, /disabledReason=\{blocked\}/);
  assert.match(detalle, /disabledReason=\{reportBlocked\}/);
});
