// Pruebas sin red de las actividades del Anexo A en el alta de dominio (RC-59). Node 22.18 o más nuevo:
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ANEXO_A, PLANTILLA_VIGENTE, actividadesMarcadas } from "./anexoA.ts";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("el Anexo A de la plantilla 1 tiene las actividades 1 a 11", () => {
  assert.equal(PLANTILLA_VIGENTE, 1);
  assert.deepEqual(ANEXO_A.map((a) => a.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.ok(ANEXO_A.every((a) => a.label.trim().length > 0));
});

test("solo cuentan las actividades del Anexo A, en orden y sin repetir", () => {
  assert.deepEqual(actividadesMarcadas(["6", "1", "2", "1"]), [1, 2, 6]);
  assert.deepEqual(actividadesMarcadas(["0", "12", "1.5", " 3", "abc", 4, null]), []);
  assert.deepEqual(actividadesMarcadas([]), []);
});

test("el alta manda la versión de la plantilla y las actividades, y pide al menos una", () => {
  const form = read("../components/screens/dominios/RegisterDomainForm.tsx");
  assert.match(form, /template_version: PLANTILLA_VIGENTE/);
  assert.match(form, /activities,/);
  assert.match(form, /actividadesMarcadas\(data\.getAll\("activities"\)\)/);
  assert.match(form, /if \(activities\.length === 0\) next\.activities =/);
  assert.match(form, /name="activities" value=\{a\.id\} defaultChecked/);
  const types = read("../types/api.ts");
  assert.match(types, /template_version: 1;\r?\n {2}\/\*\* Actividades del Anexo A que autoriza la carta \(1 a 11\)\. \*\/\r?\n {2}activities: number\[\];/);
});
