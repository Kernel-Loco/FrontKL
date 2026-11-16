// Pruebas sin red de la validación de la sesión con la API caída (#108, RC-225). Node 22.18 o más nuevo:
//   npm test
// Antes, cualquier fallo de GET /auth/me (red, tiempo agotado, 5xx) se trataba como sesión terminada:
// el layout mandaba a /auth/expirada, que borra la cookie, y todos quedaban fuera con la API caída.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkSession, isSessionRejected } from "./check.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const responde = (status, body = "{}") => () => Promise.resolve(new Response(body, { status }));
const falla = (error) => () => Promise.reject(error);
// Como statusFromFetchFailure de src/lib/http.ts.
const failureStatus = (error) => (error instanceof DOMException && error.name === "TimeoutError" ? 504 : 0);

test("solo 401 y 403 terminan la sesión", async () => {
  assert.deepEqual(await checkSession(responde(401), failureStatus), { kind: "rejected" });
  assert.deepEqual(await checkSession(responde(403), failureStatus), { kind: "rejected" });
  for (const status of [400, 404, 429, 500, 502, 503, 504]) {
    assert.equal(isSessionRejected(status), false, `status ${status}`);
    assert.deepEqual(await checkSession(responde(status), failureStatus), { kind: "unavailable", status });
  }
});

test("sin red o con el tope de tiempo agotado, el servicio está caído, no la sesión", async () => {
  assert.deepEqual(await checkSession(falla(new TypeError("fetch failed")), failureStatus), { kind: "unavailable", status: 0 });
  assert.deepEqual(await checkSession(falla(new DOMException("timeout", "TimeoutError")), failureStatus), {
    kind: "unavailable",
    status: 504,
  });
});

test("el tope de tiempo corta una API colgada", async () => {
  const colgada = () =>
    new Promise((_, reject) => {
      const signal = AbortSignal.timeout(20);
      signal.addEventListener("abort", () => reject(signal.reason));
    });
  // El temporizador de AbortSignal.timeout no retiene el proceso: este sí, mientras dura la prueba.
  const retener = setTimeout(() => {}, 5_000);
  try {
    assert.deepEqual(await checkSession(colgada, failureStatus), { kind: "unavailable", status: 504 });
  } finally {
    clearTimeout(retener);
  }
});

test("un 200 con cuerpo que no es JSON no deja entrar ni saca", async () => {
  assert.deepEqual(await checkSession(responde(200, "<html>"), failureStatus), { kind: "unavailable", status: 502 });
});

test("un 200 con el usuario es sesión válida", async () => {
  const user = { id: "u1", role: "analyst" };
  assert.deepEqual(await checkSession(responde(200, JSON.stringify(user)), failureStatus), { kind: "valid", user });
});

test("getServerSession usa el tope de 15 s y lanza ServiceError en vez de null si la API falla", () => {
  const fuente = leer("./server.ts");
  assert.match(fuente, /signal: withTimeout\(\)/);
  assert.match(fuente, /checkSession\(/);
  assert.match(fuente, /throw new ServiceError\(/);
  // Sin los comentarios de línea, para no mirarlos con una regex que retrocede de más (CodeQL).
  const sinComentarios = fuente.replace(/\/\/[^\n]*/g, "");
  assert.doesNotMatch(sinComentarios, /catch\s*\{\s*return null/);
});

test("el layout del panel atrapa el ServiceError de la sesión y no manda a /auth/expirada", () => {
  const fuente = leer("../../app/(dashboard)/layout.tsx");
  const atrapa = fuente.indexOf("session = await getServerSession()");
  assert.ok(atrapa > 0, "el layout pide la sesión dentro del try");
  assert.ok(fuente.indexOf("catch (error)") > atrapa);
  assert.ok(fuente.indexOf("<ServiceUnavailable") > atrapa);
  assert.ok(fuente.indexOf('redirect("/auth/expirada")') > fuente.indexOf("<ServiceUnavailable"));
});
