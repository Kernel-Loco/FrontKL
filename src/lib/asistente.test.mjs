// RC-77 (#38): pantalla del asistente de IA en Hallazgos. node --test, sin red. asistente.ts se importa (Node quita
// los tipos); el servicio, el panel y la página usan alias @/ y se leen como texto, como en escaneosDominio.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import nextConfig from "../../next.config.ts";
import {
  bloquesDeRespuesta,
  citasDeRespuesta,
  fallaDelAsistente,
  hallazgosParaAsistente,
  MAX_HALLAZGOS_ASISTENTE,
  MAX_LARGO_PREGUNTA,
  preguntaValida,
  TIEMPO_API_ASISTENTE_MS,
  TIEMPO_MAXIMO_ASISTENTE_MS,
} from "./asistente.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const hallazgo = (id, severity) => ({ id, severity });

test("1. los topes son los de AssistantQuestion de la API: 20 hallazgos y 1000 caracteres", () => {
  assert.equal(MAX_HALLAZGOS_ASISTENTE, 20);
  assert.equal(MAX_LARGO_PREGUNTA, 1000);
});

test("1b. ni el reenvío de Next ni el navegador cortan antes que la API, en ese orden", async () => {
  // Tope de la API para toda la pregunta, con los dos proveedores (ASSISTANT_DEADLINE_SECONDS de asistente.py).
  assert.equal(TIEMPO_API_ASISTENTE_MS, 30_000);
  // Sin experimental.proxyTimeout, Next corta /api/v1/* a los 30 s con un 500 genérico y se pierde el 503 de la API.
  const corteDelProxy = nextConfig.experimental?.proxyTimeout;
  assert.equal(typeof corteDelProxy, "number");
  assert.ok(corteDelProxy > TIEMPO_API_ASISTENTE_MS, `el reenvío corta a los ${corteDelProxy} ms`);
  assert.ok(TIEMPO_MAXIMO_ASISTENTE_MS > corteDelProxy, "el navegador corta antes que el reenvío");
  // El corte vale para el reenvío por el que pasa la pregunta.
  const [reenvio] = await nextConfig.rewrites();
  assert.equal(reenvio.source, "/api/v1/:path*");
});

test("1c. la versión instalada de Next sí lee experimental.proxyTimeout al reenviar", () => {
  // Si Next cambia el nombre de la opción o deja de pasarla al reenvío, la 1b seguiría pasando: esta no.
  const siguiente = (ruta) => readFileSync(new URL(`../../node_modules/next/dist/server/${ruta}`, import.meta.url), "utf8");
  assert.match(siguiente("config-schema.js"), /proxyTimeout: _zod\.z\.number\(\)/);
  assert.match(siguiente("lib/router-server.js"), /proxyRequest\)\(req, res, parsedUrl,[^;]*config\.experimental\.proxyTimeout\)/);
  assert.match(siguiente("lib/router-utils/proxy-request.js"), /proxyTimeout: proxyTimeout === null \? undefined : proxyTimeout \|\| 30000/);
});

test("2. manda los más graves primero, respeta el orden de la lista entre iguales y no repite ids", () => {
  const lista = [hallazgo("a", "low"), hallazgo("b", "critical"), hallazgo("c", "medium"), hallazgo("d", "critical"),
    hallazgo("b", "critical"), hallazgo("e", "high")];
  assert.deepEqual(hallazgosParaAsistente(lista).map((h) => h.id), ["b", "d", "e", "c", "a"]);
  assert.deepEqual(hallazgosParaAsistente([]), []);
});

test("3. con más de 20 hallazgos manda solo 20, sin dejar fuera un crítico por uno bajo", () => {
  const lista = [
    ...Array.from({ length: 25 }, (_, i) => hallazgo(`bajo-${i}`, "low")),
    hallazgo("critico", "critical"),
  ];
  const enviados = hallazgosParaAsistente(lista);
  assert.equal(enviados.length, 20);
  assert.equal(enviados[0].id, "critico");
  assert.equal(enviados.at(-1).id, "bajo-18");
});

test("4. la pregunta va recortada, y vacía o de más de 1000 caracteres no se manda", () => {
  assert.equal(preguntaValida("  ¿Qué atiendo primero?  "), "¿Qué atiendo primero?");
  assert.equal(preguntaValida("   \n "), null);
  assert.equal(preguntaValida("a".repeat(1000)), "a".repeat(1000));
  assert.equal(preguntaValida("a".repeat(1001)), null);
});

test("5. la respuesta se parte en párrafos, viñetas, listas numeradas y negritas", () => {
  const respuesta = "## Resumen\nTienes **dos** hallazgos.\nSigue el plan.\n\n- Primero el **SPF**\n* Después DMARC\n1. Uno\n2) Dos";
  assert.deepEqual(bloquesDeRespuesta(respuesta), [
    { tipo: "parrafo", tramos: [{ texto: "Resumen", negrita: true }] },
    { tipo: "parrafo", tramos: [{ texto: "Tienes ", negrita: false }, { texto: "dos", negrita: true }, { texto: " hallazgos. Sigue el plan.", negrita: false }] },
    { tipo: "lista", elementos: [[{ texto: "Primero el ", negrita: false }, { texto: "SPF", negrita: true }], [{ texto: "Después DMARC", negrita: false }]] },
    { tipo: "numerada", inicio: 1, elementos: [[{ texto: "Uno", negrita: false }], [{ texto: "Dos", negrita: false }]] },
  ]);
});

test("5b. una lista numerada partida por un párrafo sigue su cuenta, y una línea vacía no la parte", () => {
  const bloques = bloquesDeRespuesta(["1. Uno", "", "2. Dos", "Un párrafo.", "3. Tres", "4) Cuatro"].join("\n"));
  assert.deepEqual(bloques.map((b) => [b.tipo, b.inicio, b.elementos?.length]), [
    ["numerada", 1, 2],
    ["parrafo", undefined, undefined],
    ["numerada", 3, 2],
  ]);
});

test("5c. una tabla de markdown se vuelve tabla, sin barras ni la línea |---| como texto", () => {
  const respuesta = [
    "Resumen:",
    "| Hallazgo | Criticidad | Qué hacer |",
    "|---|:---:|---|",
    "| **SPF** mal configurado [H1] | Alta | Corrige el registro<br>de correo |",
    "| Barra \\| dentro | Baja |",
    "| Sobra | Media | Algo | Extra |",
    "",
    "Después de la tabla.",
  ].join("\n");
  const bloques = bloquesDeRespuesta(respuesta);
  assert.deepEqual(bloques.map((b) => b.tipo), ["parrafo", "tabla", "parrafo"]);
  const texto = (celda) => celda.map((t) => t.texto).join("");
  const [, tabla] = bloques;
  assert.deepEqual(tabla.encabezados.map(texto), ["Hallazgo", "Criticidad", "Qué hacer", ""]);
  assert.deepEqual(tabla.filas.map((fila) => fila.map(texto)), [
    ["SPF mal configurado [H1]", "Alta", "Corrige el registro de correo", ""],
    ["Barra | dentro", "Baja", "", ""],
    ["Sobra", "Media", "Algo", "Extra"],
  ]);
  assert.deepEqual(tabla.filas[0][0][0], { texto: "SPF", negrita: true });
  assert.ok(!JSON.stringify(bloques).includes("---"));
  // Sin la línea |---| no es tabla, y una línea de guiones sola tampoco.
  assert.deepEqual(bloquesDeRespuesta("a | b\nc | d").map((b) => b.tipo), ["parrafo"]);
  assert.deepEqual(bloquesDeRespuesta("Texto\n---\nMás").map((b) => b.tipo), ["parrafo"]);
});

test("5d. las citas [H1] se leen en orden, sin repetir y solo de los hallazgos enviados", () => {
  assert.deepEqual(citasDeRespuesta("Primero [H2], luego [H1, H3] y [H2 y H4]. Ojo con [H9] y H1 sin corchetes.", 4), [2, 1, 3, 4]);
  assert.deepEqual(citasDeRespuesta("Sin citas.", 3), []);
  assert.deepEqual(citasDeRespuesta("[H0] [H5]", 4), []);
});

test("6. el HTML del modelo queda como texto y un ** sin cerrar no se vuelve negrita", () => {
  const html = '<img src=x onerror="alert(1)"> **abierto';
  assert.deepEqual(bloquesDeRespuesta(html), [{ tipo: "parrafo", tramos: [{ texto: html, negrita: false }] }]);
  assert.deepEqual(bloquesDeRespuesta("\r\n\r\n"), []);
});

test("6b. el 404, el 429 y el 503 de la API muestran su mensaje; otro status o sin detail, el genérico", () => {
  const conDetalle = (mensaje) => ({ detail: mensaje });
  assert.deepEqual(fallaDelAsistente(503, conDetalle("El asistente no está disponible.")), {
    codigo: "assistant_503",
    mensaje: "El asistente no está disponible.",
  });
  assert.deepEqual(fallaDelAsistente(429, conDetalle("Alcanzaste el límite.")), { codigo: "assistant_429", mensaje: "Alcanzaste el límite." });
  assert.deepEqual(fallaDelAsistente(404, conDetalle("Uno o más hallazgos no están disponibles.")), {
    codigo: "assistant_404",
    mensaje: "Uno o más hallazgos no están disponibles.",
  });
  assert.equal(fallaDelAsistente(500, conDetalle("Error interno")), null);
  assert.equal(fallaDelAsistente(422, conDetalle("Escribe una pregunta")), null);
  assert.equal(fallaDelAsistente(503, "Service Unavailable"), null);
  assert.equal(fallaDelAsistente(503, conDetalle([{ msg: "x" }])), null);
  assert.equal(fallaDelAsistente(503, conDetalle("   ")), null);
  assert.equal(fallaDelAsistente(503, null), null);
});

test("7. el servicio llama a POST /domains/{fqdn}/assistant con question y finding_ids y su propio tope de tiempo", () => {
  const servicio = leer("../services/assistantService.ts");
  assert.match(servicio, /apiClient\.post<AssistantAnswer>\(\s*`\/domains\/\$\{encodeURIComponent\(fqdn\)\}\/assistant`/);
  assert.match(servicio, /\{ question, finding_ids: findingIds \}/);
  assert.match(servicio, /\{ signal, timeoutMs: TIEMPO_MAXIMO_ASISTENTE_MS \}/);
  // El 404, el 429 y el 503 pasan por fallaDelAsistente (prueba 6b) a un ServiceError con su código y su status.
  assert.match(servicio, /fallaDelAsistente\(error\.status, error\.detail\)/);
  assert.match(servicio, /throw new ServiceError\(falla\.codigo, falla\.mensaje, \{ status: error\.status \}\)/);
  const cliente = leer("./apiClient.ts");
  assert.match(cliente, /signal: withTimeout\(init\.signal, timeoutMs\)/);
  assert.match(leer("./http.ts"), /export function withTimeout\(signal\?: AbortSignal \| null, ms = REQUEST_TIMEOUT_MS\)/);
});

test("8. el panel manda los hallazgos elegidos y pinta la respuesta con elementos de React, nunca como HTML", () => {
  const panel = leer("../components/screens/hallazgos/AssistantPanel.tsx");
  assert.match(panel, /const enviados = hallazgosParaAsistente\(findings\);/);
  assert.match(panel, /askAssistant\(domain, limpia, enviados\.map\(\(f\) => f\.id\), actual\.signal\)/);
  assert.match(panel, /bloquesDeRespuesta\(texto\)/);
  assert.match(panel, /maxLength=\{MAX_LARGO_PREGUNTA\}/);
  assert.doesNotMatch(panel, /dangerouslySetInnerHTML|innerHTML/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage/);
  // La lista numerada sigue el número del modelo.
  assert.match(panel, /<ol key=\{indice\} start=\{bloque\.inicio\}/);
});

test("8b. el panel avisa sin repetir, guarda el borrador y ofrece salida según la falla", () => {
  const panel = leer("../components/screens/hallazgos/AssistantPanel.tsx");
  // Una sola región viva propia: el error ya es role="alert" (InlineAlert) y no va dentro de otra región.
  assert.doesNotMatch(panel, /aria-live/);
  assert.equal(panel.match(/role="status"/g)?.length, 1);
  // Solo borra la pregunta si no cambió durante la espera.
  assert.match(panel, /setPregunta\(\(actualTexto\) => \(actualTexto === texto \? "" : actualTexto\)\)/);
  // 503: el mensaje de la API dice 'consulta el reporte del dominio' y el enlace lleva a la página del dominio, donde
  // se genera el reporte. 404: el hallazgo ya no está abierto, ofrece recargar la lista.
  assert.match(panel, /error\.codigo === "assistant_503" && \([\s\S]*?\/dashboard\/dominios\/\$\{encodeURIComponent\(domain\)\}`[\s\S]*?Ir al reporte del dominio/);
  assert.match(leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx"), /<ReportButton /);
  assert.match(panel, /error\.codigo === "assistant_404" && \([\s\S]*?onClick=\{recargarHallazgos\}/);
  // Al recargar se va el botón con el foco: el foco pasa al título del panel.
  assert.match(panel, /function recargarHallazgos\(\) \{\s*setError\(null\);\s*router\.refresh\(\);[\s\S]*?titulo\.current\?\.focus\(\);/);
  assert.match(panel, /<h2 id=\{ids\.titulo\} ref=\{titulo\} tabIndex=\{-1\}/);
  // Las citas [HN] se muestran con el título del hallazgo N enviado.
  assert.match(panel, /const titulos = enviados\.map\(\(f\) => f\.title\);/);
  assert.match(panel, /citasDeRespuesta\(intercambio\.respuesta, total\)/);
  assert.match(panel, /intercambio\.titulos\[n - 1\]/);
  // La ayuda dice que la pregunta va al modelo y que cuenta aunque no llegue la respuesta.
  assert.match(panel, /Al modelo van tu pregunta y el título/);
  assert.match(panel, /cada una cuenta aunque el\s+asistente no responda o salgas de la pantalla/);
});

test("9. solo Analista y Admin ven el asistente, sobre la lista filtrada de Hallazgos", () => {
  const permisos = leer("../config/permissions.ts");
  assert.match(permisos, /analista: \["request_scan", "request_report", "ask_assistant"\]/);
  assert.match(permisos, /gerente: \["request_report"\]/);
  assert.match(permisos, /admin: \["register_domain", "verify_txt", "request_scan", "request_report", "ask_assistant"\]/);
  const pagina = leer("../app/(dashboard)/dashboard/hallazgos/page.tsx");
  assert.match(pagina, /canAsk=\{can\(user\.role, "ask_assistant"\)\}/);
  const explorador = leer("../components/screens/hallazgos/FindingsExplorer.tsx");
  assert.match(explorador, /\{canAsk && findings\.length > 0 && <AssistantPanel domain=\{domain\} findings=\{visible\} \/>\}/);
});
