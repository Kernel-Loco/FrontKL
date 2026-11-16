// Cambios semanales en el histórico (#37, RC-73): el portal lee weekly_changes de /score/history. node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mockScoreHistory } from "../mocks/api/contrato.ts";
import { lastScanSummary, latestScan, weeklyChangeNotes } from "./cambiosSemanales.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const cambios = (extra) => ({
  previous_scan_id: "s-1", previous_scan_at: "2026-11-08T10:00:00Z", assets_before: 8, assets_now: 10, new_assets: 2,
  assets_growth_percent: 25, new_findings: 1,
  alerts: { new_asset: true, new_finding: true, assets_growth_over_20_percent: true }, ...extra,
});

test("1. una nota por alerta: activo nuevo, hallazgo nuevo y crecimiento de más de 20 %", () => {
  assert.deepEqual(weeklyChangeNotes(cambios()), [
    { kind: "new_asset", text: "2 activos nuevos" },
    { kind: "new_finding", text: "1 hallazgo nuevo" },
    { kind: "assets_growth", text: "Inventario +25 % en la semana (de 8 a 10)" },
  ]);
  assert.deepEqual(weeklyChangeNotes(null), []);
});

test("2. solo las alertas que la API marcó: 20 % justo o sin escaneo anterior no es crecimiento", () => {
  const sinCrecer = cambios({ assets_growth_percent: 20, alerts: { new_asset: true, new_finding: false,
    assets_growth_over_20_percent: false } });
  assert.deepEqual(weeklyChangeNotes(sinCrecer).map((n) => n.kind), ["new_asset"]);
  const primero = cambios({ previous_scan_id: null, previous_scan_at: null, assets_before: null, assets_growth_percent: null,
    new_assets: 0, alerts: { new_asset: false, new_finding: true, assets_growth_over_20_percent: false } });
  assert.deepEqual(weeklyChangeNotes(primero), [{ kind: "new_finding", text: "1 hallazgo nuevo" }]);
  assert.deepEqual(weeklyChangeNotes(cambios({ assets_growth_percent: 33.333 }))[2].text,
    "Inventario +33.3 % en la semana (de 8 a 10)");
});

test("3. el mock trae weekly_changes como el ejemplo historico.json del contrato", () => {
  const [escaneo, recalculo] = mockScoreHistory.items;
  assert.equal(recalculo.weekly_changes, null);
  assert.deepEqual(escaneo.weekly_changes.alerts, { new_asset: false, new_finding: true, assets_growth_over_20_percent: false });
  // El último escaneo, no el recálculo que viene después
  assert.equal(latestScan(mockScoreHistory.items), escaneo);
  assert.equal(latestScan([recalculo]), null);
});

test("3b. el aviso no afirma una comparación que la API no hizo", () => {
  const [escaneo] = mockScoreHistory.items;
  // Primer escaneo (previous_scan_id null): sin «frente al escaneo anterior»
  assert.equal(lastScanSummary(escaneo), "3 hallazgos nuevos.");
  const sinCambios = { ...escaneo, weekly_changes: null };
  assert.doesNotMatch(lastScanSummary(sinCambios), /^Sin /);
  assert.match(lastScanSummary(sinCambios), /no marcó/);
  // Un escaneo de antes de RC-55 no contó sus hallazgos nuevos: no se dice que no hubo
  assert.match(lastScanSummary({ ...sinCambios, new_findings: null }), /no contó sus hallazgos nuevos/);
});

test("4. el histórico pinta los cambios del último escaneo y de cada fila", () => {
  const pagina = leer("../app/(dashboard)/dashboard/historico/page.tsx");
  assert.match(pagina, /\{lastScanSummary\(lastScan\)\}/);
  assert.match(pagina, /weekly_changes: point\.weekly_changes \?\? null,/);
  assert.match(pagina, /weeklyChangeNotes\(point\.weekly_changes \?\? null\)\.map\(\(note\) =>/);
});
