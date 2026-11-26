// Plan de acción por regla o por activo y en orden acumulado (RC-263). node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { leerAgrupar, reduccion, urlPlan } from "./planAcumulado.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("la agrupación de la URL: solo 'activo' cambia, todo lo demás es por regla", () => {
  assert.equal(leerAgrupar("activo"), "activo");
  for (const otro of [undefined, "", "regla", "ACTIVO", "host", ["activo"]]) assert.equal(leerAgrupar(otro), "regla");
});

test("la URL del plan conserva el dominio y no escribe la agrupación por regla", () => {
  assert.equal(urlPlan("acme-demo.mx", "regla"), "/dashboard/plan?dominio=acme-demo.mx");
  assert.equal(urlPlan("acme-demo.mx", "activo"), "/dashboard/plan?dominio=acme-demo.mx&agrupar=activo");
  assert.equal(urlPlan("a&b.mx", "activo"), "/dashboard/plan?dominio=a%26b.mx&agrupar=activo");
});

test("una reducción de 0 se lee 'sin cambio'", () => {
  assert.equal(reduccion(15), "−15");
  assert.equal(reduccion(0), "sin cambio");
});

test("la página pide el plan con la agrupación de la URL y el explorador muestra el selector y el acumulado", () => {
  const pagina = leer("../app/(dashboard)/dashboard/plan/page.tsx");
  // El gerente no ve Hallazgos: se queda con el plan por regla y sin selector (la API le da 403 por activo).
  assert.match(pagina, /const agrupar = canSeeFindings \? leerAgrupar\(params\.agrupar\) : "regla"/);
  assert.match(pagina, /canGroupByAsset=\{canSeeFindings\}/);
  assert.match(pagina, /getActionPlan\(fqdn, agrupar\)/);
  assert.match(pagina, /key=\{`\$\{fqdn\}-\$\{agrupar\}`\}/);   // cambiar de vista limpia la selección

  const consultas = leer("../services/queries.ts");
  assert.match(consultas, /action-plan\$\{agrupar === "activo" \? "\?agrupar=activo" : ""\}/);
  const servicio = leer("../services/planService.ts");
  assert.match(servicio, /if \(agrupar === "activo"\) query\.set\("agrupar", "activo"\)/);

  const explorador = leer("../components/screens/plan/ActionPlanExplorer.tsx");
  assert.match(explorador, /\{canGroupByAsset && \(\s*<nav aria-label="Agrupar el plan"/);
  assert.match(explorador, /aria-current=\{agrupar === opcion\.value \? "page" : undefined\}/);
  assert.match(explorador, /Acumulado: \{action\.score_after_acumulado\} \(\{reduccion\(action\.score_reduction_acumulado\)\}\)/);
  assert.match(explorador, /downloadActionPlan\(plan\.domain, format, agrupar\)/);
  // Por activo no hay casillas: /simulate recibe códigos de regla, no ids de activo.
  const porActivo = explorador.slice(explorador.indexOf("? (plan.actions as PlanAssetAction[])"), explorador.indexOf(": (plan.actions as PlanAction[])"));
  assert.ok(porActivo.length > 0);
  assert.doesNotMatch(porActivo, /type="checkbox"/);
});
