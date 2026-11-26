// Pruebas sin red del ciclo de remediación en Hallazgos (#80b, RC-172). Node 22.18 o más nuevo:
//   node --test src/lib/triage.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { can } from "../config/permissions.ts";
import {
  remediationTexts,
  resolvedReasons,
  reviewDateError,
  reviewDateRange,
  statusFilterFromParam,
  triageChoices,
  triageRequest,
  triageSummary,
} from "./triage.ts";

const HOY = new Date("2026-11-26T18:00:00Z");

test("el filtro de estado acepta solo los valores conocidos", () => {
  assert.equal(statusFilterFromParam(undefined), "open");
  assert.equal(statusFilterFromParam("false_positive"), "false_positive");
  assert.equal(statusFilterFromParam("all"), "all");
  assert.equal(statusFilterFromParam("borrado"), "open");
  assert.equal(statusFilterFromParam(["resolved", "open"]), "open");
});

test("cada estado ofrece sus acciones de triage", () => {
  assert.deepEqual(triageChoices("open"), ["false_positive", "accepted_risk", "resolved"]);
  assert.deepEqual(triageChoices("accepted_risk"), ["accepted_risk", "resolved", "false_positive", "open"]);
  assert.deepEqual(triageChoices("false_positive"), ["open"]);
  assert.deepEqual(triageChoices("resolved"), ["open"]);
});

test("secreto rotado solo aparece en la regla de secretos", () => {
  assert.deepEqual(resolvedReasons("spf_missing").map((r) => r.value), ["fixed"]);
  assert.deepEqual(resolvedReasons("secret_in_public_repo").map((r) => r.value), ["fixed", "secret_rotated"]);
});

test("la fecha de revisión va de mañana a un año, como la API", () => {
  assert.deepEqual(reviewDateRange(HOY), { min: "2026-11-27", max: "2027-11-26", suggested: "2027-02-24" });
  assert.equal(reviewDateError("2026-11-27", HOY), null);
  assert.equal(reviewDateError("2027-11-26", HOY), null);
  assert.match(reviewDateError("2026-11-26", HOY), /entre mañana y un año/);
  assert.match(reviewDateError("2027-11-27", HOY), /entre mañana y un año/);
  assert.match(reviewDateError("", HOY), /Elige la fecha/);
  assert.match(reviewDateError("27/11/2026", HOY), /Elige la fecha/);
});

test("el cuerpo del triage solo lleva lo que aplica a cada estado", () => {
  assert.deepEqual(triageRequest("false_positive", { reviewDate: "2027-01-01", reason: "fixed", note: "  " }), { status: "false_positive" });
  assert.deepEqual(triageRequest("accepted_risk", { reviewDate: "2027-01-01", note: " Lo ve TI " }),
    { status: "accepted_risk", review_date: "2027-01-01", note: "Lo ve TI" });
  assert.deepEqual(triageRequest("resolved", { reason: "secret_rotated" }), { status: "resolved", reason: "secret_rotated" });
  assert.equal(triageRequest("open", { note: "x".repeat(600) }).note.length, 500);
});

test("el resumen dice quién, cuándo y la fecha de revisión", () => {
  const fecha = (iso) => iso.slice(0, 10);
  assert.equal(
    triageSummary({ action: "finding.accepted_risk", at: "2026-11-26T10:00:00Z", by: "ana@acme-demo.mx", reason: null,
      review_date: "2027-01-15", note: null }, fecha),
    "Riesgo aceptado por ana@acme-demo.mx el 2026-11-26 · revisión 2027-01-15",
  );
  assert.equal(
    triageSummary({ action: "finding.resolved", at: "2026-11-26T10:00:00Z", by: null, reason: "secret_rotated",
      review_date: null, note: null }, fecha),
    "Marcado como resuelto el 2026-11-26 · secreto rotado",
  );
});

test("los textos de remediación con y sin datos", () => {
  const conDatos = remediationTexts({ domain: "x", total: 10, by_status: { open: 5, resolved: 3, accepted_risk: 1, false_positive: 1 },
    closed: 3, closed_pct: 33.3, mean_time_to_remediate_days: 4.5, remediated_count: 3 });
  assert.equal(conDatos.mttr, "4.5 días");
  assert.equal(conDatos.mttrHint, "Promedio de 3 hallazgos resueltos");
  assert.equal(conDatos.closed, "33.3 %");
  assert.equal(conDatos.closedHint, "3 de 9 (sin falsos positivos)");
  const sinDatos = remediationTexts({ domain: "x", total: 0, by_status: { open: 0, resolved: 0, accepted_risk: 0, false_positive: 0 },
    closed: 0, closed_pct: null, mean_time_to_remediate_days: null, remediated_count: 0 });
  assert.deepEqual([sinDatos.mttr, sinDatos.closed], ["—", "—"]);
  assert.equal(remediationTexts({ ...conDatos, domain: "x", total: 1, by_status: { open: 0, resolved: 1, accepted_risk: 0, false_positive: 0 },
    closed: 1, closed_pct: 100, mean_time_to_remediate_days: 1, remediated_count: 1 }).mttr, "1 día");
});

test("solo Analista y Admin hacen triage, como la API", () => {
  assert.equal(can("analista", "triage_findings"), true);
  assert.equal(can("admin", "triage_findings"), true);
  assert.equal(can("gerente", "triage_findings"), false);
});
