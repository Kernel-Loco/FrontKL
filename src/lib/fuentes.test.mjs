// Fuentes por cliente (#117, RC-235): la sección solo para Admin, un interruptor por fuente OSINT, el aviso de
// cobertura antes de apagar y el motivo nuevo de coverage_gaps. node --test, sin red ni navegador.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canAccessSection, SECTIONS } from "../config/permissions.ts";
import { COVERAGE_GAP_REASON_LABELS, coverageLines } from "./cobertura.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const pantalla = leer("../components/screens/admin/SourcesManager.tsx");

test("1. solo el Admin entra a Fuentes, en Administración", () => {
  assert.equal(SECTIONS.fuentes.href, "/dashboard/admin/fuentes");
  assert.equal(canAccessSection("admin", "fuentes"), true);
  assert.equal(canAccessSection("analista", "fuentes"), false);
  assert.equal(canAccessSection("gerente", "fuentes"), false);
  const pagina = leer("../app/(dashboard)/dashboard/admin/fuentes/page.tsx");
  assert.match(pagina, /checkSectionAccess\("fuentes"\)/);
  assert.match(pagina, /getSources\(\)/);
});

test("2. el servicio lee y cambia por las rutas de la API", () => {
  assert.match(leer("../services/queries.ts"), /apiGet<ListResponse<SourceSetting>>\("\/sources"\)/);
  assert.match(leer("../services/sourcesService.ts"),
    /apiClient\.put<SourceSetting>\(`\/sources\/\$\{encodeURIComponent\(code\)\}`, \{ enabled \}\)/);
});

test("3. un interruptor por fuente OSINT y el aviso de cobertura siempre y antes de apagar", () => {
  assert.match(pantalla, /role="switch"/);
  assert.match(pantalla, /aria-checked=\{on\}/);
  assert.match(pantalla, /disabled=\{!s\.can_change \|\| togglingCode === s\.code\}/);
  // Apagar no llama a la API al primer clic: primero muestra el aviso y pide confirmar.
  assert.match(pantalla, /if \(encendidaEnEmpresa\(s\)\) setPendingOff\(s\.code\);/);
  assert.match(pantalla, /<InlineAlert tone="warning">\{AVISO_COBERTURA\}<\/InlineAlert>/);
  assert.match(pantalla, /tx\("¿Apagar \{0\} para tu empresa\?", nombre\(s\.code\)\)\} \{AVISO_COBERTURA\}/);
  assert.match(pantalla, /reduce la cobertura/);
  assert.match(pantalla, /deja de ser comparable con los anteriores/);
  // Las de inteligencia se muestran sin interruptor.
  assert.match(pantalla, /const intel = items\.filter\(\(s\) => s\.kind === "intel"\);/);
});

test("4. coverage_gaps nombra las fuentes que la empresa apagó", () => {
  assert.ok(Object.hasOwn(COVERAGE_GAP_REASON_LABELS, "source_disabled_by_org"));
  assert.deepEqual(coverageLines([{ code: "secret_in_public_repo", source: "github", reason: "source_disabled_by_org" }]),
    ["No corrió porque tu empresa la apagó en Fuentes: GitHub (secret_in_public_repo)"]);
});
