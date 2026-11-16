// HX8 y HX20: el detalle del dominio tiene el botón 'Exportar a SIEM (NDJSON)' que baja GET /domains/{fqdn}/export/siem.
// node --test, sin red. Los servicios usan alias @/ y se leen como texto, como en platform.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("1. el servicio pide el NDJSON del dominio con la sesión y sin formato", () => {
  const servicio = leer("../services/exportService.ts");
  const siem = servicio.slice(servicio.indexOf("export function downloadSiem"));
  assert.match(siem, /fetchBlob\(`\/api\/v1\/domains\/\$\{encodeURIComponent\(domain\)\}\/export\/siem`, "application\/x-ndjson", signal\)/);
  assert.doesNotMatch(siem, /formato/);
  assert.match(servicio, /credentials: "same-origin"/);
  assert.match(servicio, /if \(!response\.ok\) throw await apiErrorFromResponse\(response\)/);
});

test("2. el botón guarda el archivo y muestra el mensaje de la API en un 403", () => {
  const boton = leer("../components/screens/shared/SiemExportButton.tsx");
  assert.match(boton, /Exportar a SIEM \(NDJSON\)/);
  assert.match(boton, /downloadSiem\(domain, current\.signal\)/);
  assert.match(boton, /saveBlob\(blob, `\$\{domain\}-siem\.ndjson`\)/);
  assert.match(boton, /getErrorMessage\(error, \{ apiMessageOn403: true \}\)/);
  assert.match(boton, /aria-live="polite"/);
});

test("3. el detalle del dominio lo muestra a quien puede pedir reportes, con key por dominio", () => {
  const pagina = leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.match(pagina, /can\(user\.role, "request_report"\) && <SiemExportButton key=\{`siem-\$\{fqdn\}`\} domain=\{fqdn\} \/>/);
});
