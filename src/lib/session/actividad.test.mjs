// Pruebas sin red de la inactividad compartida entre pestañas (RC-311, hallazgo alto #1 de la revisión del PR 55).
//   npm test
// Antes, cada pestaña contaba su plazo solo con su propia actividad: con dos pestañas abiertas, la quieta llegaba a
// su plazo y llamaba a POST /auth/logout, que borra la sesión de todas, aunque el usuario trabajara en la otra.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ACTIVITY_KEY,
  announceEnded,
  ENDED_KEY,
  endedElsewhere,
  parseTime,
  readActivity,
  recordActivity,
  SHARE_INTERVAL_MS,
  sharedIdleDeadline,
} from "./actividad.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const sinComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const MIN = 60_000;
const IDLE = 15 * MIN;

/** localStorage de mentira: el mismo para todas las pestañas del navegador. */
function almacen() {
  const datos = new Map();
  return {
    getItem: (llave) => (datos.has(llave) ? datos.get(llave) : null),
    setItem: (llave, valor) => datos.set(llave, String(valor)),
    datos,
  };
}

/**
 * Una pestaña con la misma cuenta que IdleTimeout.tsx: la actividad mueve su plazo y lo comparte (touch), y cada
 * segundo del contador vuelve a leer la actividad de todas antes de decidir el cierre (tick).
 */
function pestana(store, montadaEn) {
  const p = { plazo: 0, compartida: -Infinity, cerro: false };
  p.actividad = (at) => {
    p.plazo = at + IDLE;
    if (at - p.compartida < SHARE_INTERVAL_MS) return;
    p.compartida = at;
    recordActivity(store, at);
  };
  p.tick = (at) => {
    p.plazo = sharedIdleDeadline(p.plazo, store, IDLE, at);
    if (p.plazo - at <= 0) p.cerro = true;
    return p.cerro;
  };
  p.actividad(montadaEn);
  return p;
}

test("con actividad solo en la segunda pestaña, la primera no cierra la sesión", () => {
  const store = almacen();
  const quieta = pestana(store, 0);
  const activa = pestana(store, 0);
  // El usuario trabaja 40 min en la segunda; la primera no recibe ningún evento suyo.
  for (let at = 0; at <= 40 * MIN; at += 1000) {
    if (at % (2 * MIN) === 0) activa.actividad(at);
    assert.equal(quieta.tick(at), false, `la pestaña quieta cerró a los ${at / MIN} min`);
    assert.equal(activa.tick(at), false);
  }
});

test("sin actividad en ninguna, las dos cierran al mismo plazo", () => {
  const store = almacen();
  const a = pestana(store, 0);
  const b = pestana(store, 0);
  b.actividad(5 * MIN);
  assert.equal(a.tick(5 * MIN + IDLE - 1000), false);
  assert.equal(b.tick(5 * MIN + IDLE - 1000), false);
  assert.equal(a.tick(5 * MIN + IDLE), true);
  assert.equal(b.tick(5 * MIN + IDLE), true);
});

test("una pestaña con el contador congelado ve la actividad de las demás al volver", () => {
  const store = almacen();
  const congelada = pestana(store, 0);
  const activa = pestana(store, 0);
  activa.actividad(20 * MIN);
  // El navegador no corrió su contador en 25 min: su plazo local ya pasó, pero la actividad compartida no.
  assert.equal(congelada.tick(25 * MIN), false);
  assert.equal(congelada.plazo, 20 * MIN + IDLE);
});

test("sin localStorage, cada pestaña cuenta sola como antes", () => {
  const a = pestana(null, 0);
  const b = pestana(null, 0);
  b.actividad(10 * MIN);
  assert.equal(a.tick(IDLE), true);
  assert.equal(b.tick(IDLE), false);
  const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("lleno"); } };
  assert.doesNotThrow(() => recordActivity(roto, 1000));
  assert.doesNotThrow(() => announceEnded(roto, "expired", 1000));
  assert.equal(readActivity(roto, 1000), undefined);
  assert.equal(sharedIdleDeadline(IDLE, roto, IDLE, 1000), IDLE);
});

test("la llave solo guarda una hora, nunca retrocede y una hora futura no alarga el plazo", () => {
  const store = almacen();
  recordActivity(store, 5000.7);
  recordActivity(store, 3000);
  assert.deepEqual([...store.datos], [[ACTIVITY_KEY, "5000"]]);
  store.setItem(ACTIVITY_KEY, String(10 * IDLE));
  assert.equal(readActivity(store, 1000), 1000);
  assert.equal(sharedIdleDeadline(0, store, IDLE, 1000), 1000 + IDLE);
  for (const basura of [null, "", "abc", "-5", "1e20", "12.5", "0", "9".repeat(16), " 5"]) {
    assert.equal(parseTime(basura), undefined, String(basura));
  }
});

test("si una pestaña cierra la sesión, las demás salen con su aviso, salvo que alguien haya vuelto a entrar", () => {
  const store = almacen();
  recordActivity(store, 1000);
  announceEnded(store, "expired", 2000);
  const valor = store.getItem(ENDED_KEY);
  assert.equal(valor, "2000:expired");
  assert.equal(endedElsewhere(valor, store, 2500), "expired");
  // Después del cierre hubo actividad: una sesión nueva en otra pestaña, que comparte la cookie.
  recordActivity(store, 3000);
  assert.equal(endedElsewhere(valor, store, 3500), undefined);
  for (const basura of [null, "", "2000", "x:expired", "2000:expired&x=1", "2000:https://otro.sitio"]) {
    assert.equal(endedElsewhere(basura, almacen(), 5000), undefined, String(basura));
  }
});

test("IdleTimeout cuenta con la actividad compartida antes de cerrar y escucha el aviso de las demás", () => {
  const codigo = sinComentarios(leer("../../components/IdleTimeout.tsx"));
  const tick = codigo.slice(codigo.indexOf("const tick = () =>"), codigo.indexOf("if (left <= 0)"));
  assert.match(tick, /idleDeadline\.current = sharedIdleDeadline\(idleDeadline\.current, sharedStore\(\), idleSpan\.current, at\)/);
  assert.ok(tick.indexOf("sharedIdleDeadline(") < tick.indexOf("const idleLeft"), "el plazo compartido va antes de la cuenta");
  // Toda actividad local y toda renovación del servidor pasan por touch, que la comparte.
  assert.equal((codigo.match(/idleDeadline\.current = (?:now|at|Date\.now\(\)) \+ idleSpan\.current/g) ?? []).length, 1);
  assert.match(codigo, /const touch = useCallback\(\(at: number\) => \{\s*idleDeadline\.current = at \+ idleSpan\.current;/);
  assert.match(codigo, /recordActivity\(sharedStore\(\), at\)/);
  assert.match(codigo, /window\.addEventListener\("storage", onStorage\)/);
  assert.match(codigo, /window\.removeEventListener\("storage", onStorage\)/);
  assert.match(codigo, /endedElsewhere\(event\.newValue, sharedStore\(\), Date\.now\(\)\)/);
  // La pestaña que sale por el aviso de otra no vuelve a pedir POST /auth/logout.
  const fuera = codigo.slice(codigo.indexOf("const leaveFromElsewhere"), codigo.indexOf("const touch"));
  assert.doesNotMatch(fuera, /logout\(/);
  assert.match(fuera, /leaveSession\(loginNoticeFrom\(notice\)\)/);
});

test("cerrar sesión, a mano o por inactividad, avisa a las demás pestañas", () => {
  for (const archivo of ["../../components/Sidebar.tsx", "../../components/IdleTimeout.tsx"]) {
    const codigo = sinComentarios(leer(archivo));
    assert.match(codigo, /announceEnded\(sharedStore\(\), (?:notice|"logout"), Date\.now\(\)\);\s*await logout\(\);/, archivo);
  }
});
