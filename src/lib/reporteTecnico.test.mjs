// Reporte técnico (#46, RC-81): el PDF y el HTML salen del HTML de GET /domains/{fqdn}/report/technical?formato=html,
// como el ejecutivo (RC-70 punto 4). node --test, sin red ni navegador.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canAccessSection } from "../config/permissions.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const boton = leer("../components/screens/shared/ReportButton.tsx");

test("1. el servicio pide el HTML del técnico a su ruta de la API", () => {
  const servicio = leer("../services/reportService.ts");
  assert.match(servicio, /export function downloadTechnicalHtml\(/);
  assert.match(servicio, /downloadExport\(`\/domains\/\$\{encodeURIComponent\(domain\)\}\/report\/technical`, "html", signal\)/);
});

test("2. el botón pide el técnico solo en tpdf y thtml, lo guarda con su nombre y lo imprime por el mismo camino", () => {
  assert.equal(boton.match(/downloadTechnicalHtml\(/g).length, 1);
  assert.match(boton, /const isTechnical = format === "tpdf" \|\| format === "thtml";/);
  assert.match(boton, /isTechnical \? downloadTechnicalHtml\(domain, current\.signal\) : downloadExecutiveHtml\(domain, current\.signal\)/);
  // Cada formato con su nombre: el ejecutivo no se guarda como técnico ni al revés.
  assert.match(boton, /format === "html"\) \{\s*saveBlob\(blob, `\$\{domain\}-resumen-ejecutivo\.html`\)/);
  assert.match(boton, /format === "thtml"\) \{\s*saveBlob\(blob, `\$\{domain\}-reporte-tecnico\.html`\)/);
  // Una sola impresión para los dos PDF: no hay un segundo armado del técnico en el portal.
  assert.equal(boton.match(/printReportHtml\(/g).length, 1);
  assert.doesNotMatch(boton, /jspdf|reporteEjecutivo|getTechnicalReport/i);
});

test("3. los botones del técnico solo salen con technical y se frenan igual que los del ejecutivo", () => {
  assert.match(boton, /technical = false/);
  const bloque = boton.slice(boton.indexOf("{technical && ("));
  assert.ok(boton.includes("{technical && ("));
  for (const kind of ["tpdf", "thtml"]) {
    // String.raw deja las barras: en un template normal "\|\|" queda como "||" y la expresión aceptaba cualquier texto.
    assert.match(bloque, new RegExp(String.raw`loading=\{busy === "${kind}"\} disabled=\{Boolean\(disabledReason\) \|\| busy !== null\}`));
    assert.ok(bloque.includes(`onClick={() => run("${kind}")}`), kind);
  }
  assert.match(bloque, /aria-label="Exportar reporte técnico en PDF"/);
  assert.match(bloque, /aria-label="Exportar reporte técnico en HTML"/);
});

test("4. las pantallas solo se lo dan a quien ve Hallazgos (la API da 403 al gerente)", () => {
  // Los mismos roles que LEE_HALLAZGOS de BackKL (cirdan/api/v1.py: analyst y admin).
  assert.deepEqual(["analista", "gerente", "admin"].map((r) => canAccessSection(r, "hallazgos")), [true, false, true]);
  for (const pagina of ["../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx", "../app/(dashboard)/dashboard/historico/page.tsx"]) {
    const src = leer(pagina);
    assert.match(src, /const canSeeFindings = canAccessSection\(user\.role, "hallazgos"\);/, pagina);
    assert.match(src, /<ReportButton [^>]*technical=\{canSeeFindings\}/, pagina);
  }
});
