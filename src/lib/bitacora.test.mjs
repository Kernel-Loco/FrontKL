import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("la bitácora declara sus datos de ejemplo y no simula una verificación", () => {
  const page = read("../app/(dashboard)/dashboard/admin/bitacora/page.tsx");
  const explorer = read("../components/screens/admin/AuditExplorer.tsx");
  assert.match(page, /<AvisoSimulado datos=\{\["getAuditLog"\]\}/);
  assert.match(explorer, /<ActionButton variant="secondary" disabled aria-describedby=\{integrityId\}>/);
  assert.match(explorer, /La verificación todavía no está disponible/);
  assert.match(explorer, /no permiten comprobar la cadena real/);
});

test("el actor platform conserva su etiqueta y está disponible como filtro", () => {
  const labels = read("../config/labels.ts");
  const explorer = read("../components/screens/admin/AuditExplorer.tsx");
  const table = read("../components/screens/admin/AuditTable.tsx");
  assert.match(labels, /platform: "Superadmin de LowTide"/);
  assert.match(explorer, /Object\.keys\(AUDIT_ACTOR_LABELS\)/);
  assert.match(table, /AUDIT_ACTOR_LABELS\[e\.actor_type\]/);
});
