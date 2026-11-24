// Pruebas sin red de la inactividad compartida entre pestañas (RC-311, hallazgo alto #1 de la revisión del PR 55).
//   npm test
// Antes, cada pestaña contaba su plazo solo con su propia actividad: con dos pestañas abiertas, la quieta llegaba a
// su plazo y llamaba a POST /auth/logout, que borra la sesión de todas, aunque el usuario trabajara en la otra.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ACTIVITY_KEY,
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

/** Otra pestaña del mismo navegador: el módulo cargado aparte, como en el navegador, con su propio estado. */
const otraPestana = (nombre) => import(`./actividad.ts?pestana=${nombre}`);

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

test("sin localStorage, cada pestaña cuenta sola como antes", async () => {
  const a = pestana(null, 0);
  const b = pestana(null, 0);
  b.actividad(10 * MIN);
  assert.equal(a.tick(IDLE), true);
  assert.equal(b.tick(IDLE), false);
  const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("lleno"); } };
  assert.doesNotThrow(() => recordActivity(roto, 1000));
  const cierra = await otraPestana("rota");
  assert.doesNotThrow(() => cierra.announceEnded(roto, "expired", 1000));
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

test("si una pestaña cierra la sesión, las demás salen con su aviso, salvo que alguien haya vuelto a entrar", async () => {
  const store = almacen();
  recordActivity(store, 1000);
  const cierra = await otraPestana("cierra");
  cierra.announceEnded(store, "expired", 2000);
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
  assert.match(tick, /const before = idleDeadline\.current;\s*idleDeadline\.current = sharedIdleDeadline\(before, sharedStore\(\), idleSpan\.current, at\)/);
  assert.ok(tick.indexOf("sharedIdleDeadline(") < tick.indexOf("const idleLeft"), "el plazo compartido va antes de la cuenta");
  // Toda actividad local y toda renovación del servidor pasan por touch, que la comparte.
  assert.equal((codigo.match(/idleDeadline\.current = (?:now|at|Date\.now\(\)) \+ idleSpan\.current/g) ?? []).length, 1);
  assert.match(codigo, /const touch = useCallback\(\(at: number\) => \{\s*if \(ending\.current\) return;\s*idleDeadline\.current = at \+ idleSpan\.current;/);
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

// Ronda 1 de la revisión de riesgo de RC-311.


test("la pestaña que anunció el cierre ya no escribe actividad, así que el aviso sigue valiendo (#10, #3 y #7)", async () => {
  const a = await otraPestana("a-cierra");
  const b = await otraPestana("b-congelada");
  const store = almacen();
  a.recordActivity(store, 1000);
  a.announceEnded(store, "logout", 2000);
  // Mientras espera POST /auth/logout: un mousemove, el sondeo de un escaneo o la respuesta del propio logout.
  a.recordActivity(store, 4000);
  assert.equal(store.getItem(ACTIVITY_KEY), "1000");
  // La pestaña congelada procesa el aviso tarde y aun así sale.
  assert.equal(b.endedElsewhere(store.getItem(ENDED_KEY), store, 9000), "logout");
  // Las demás pestañas sí siguen escribiendo: un nuevo inicio de sesión en otra invalida el aviso.
  b.recordActivity(store, 10_000);
  assert.equal(b.endedElsewhere(store.getItem(ENDED_KEY), store, 11_000), undefined);
});

test("con actividad de otra pestaña, la quieta pregunta al servidor por la sesión vigente (#2 y #11)", async () => {
  const { needsServerCheck } = await otraPestana("quieta");
  const activa = await otraPestana("activa");
  const REFRESH = 30_000;
  const store = almacen();
  // Otra pestaña (quizá una sesión nueva) alargó el plazo con actividad de hace 1 s: toca preguntar.
  activa.recordActivity(store, 100 * MIN - 1000);
  assert.equal(needsServerCheck(20 * MIN, 100 * MIN - 1000 + IDLE, store, 100 * MIN, 0, REFRESH), true);
  // No más de una vez cada 30 s.
  assert.equal(needsServerCheck(20 * MIN, 100 * MIN - 1000 + IDLE, store, 100 * MIN, 100 * MIN - 10_000, REFRESH), false);
  // El plazo no se movió (la actividad es de esta misma pestaña, que ya sincroniza sola): no pregunta.
  assert.equal(needsServerCheck(110 * MIN, 110 * MIN, store, 100 * MIN, 0, REFRESH), false);
  // La actividad ajena es vieja (pestaña que vuelve tras horas congelada): no renueva sola la sesión en el servidor.
  assert.equal(needsServerCheck(20 * MIN, 100 * MIN - 1000 + IDLE, store, 100 * MIN + REFRESH, 0, REFRESH), false);
  assert.equal(needsServerCheck(20 * MIN, 30 * MIN, almacen(), 100 * MIN, 0, REFRESH), false);
});

test("IdleTimeout toma el tope y el usuario de la sesión vigente cuando otra pestaña lo mantiene vivo (#2 y #11)", () => {
  const codigo = sinComentarios(leer("../../components/IdleTimeout.tsx"));
  const tick = codigo.slice(codigo.indexOf("const tick = () =>"), codigo.indexOf("if (left <= 0)"));
  assert.match(
    tick,
    /if \(needsServerCheck\(before, idleDeadline\.current, sharedStore\(\), at, lastRefresh\.current, SESSION_REFRESH_INTERVAL_MS\)\) \{\s*lastRefresh\.current = at;\s*syncWithServer\(false\);/,
  );
  const sync = codigo.slice(codigo.indexOf("const syncWithServer"), codigo.indexOf("useEffect("));
  // El tope absoluto sale de /auth/me, y la actividad ajena no cuenta como de esta pestaña.
  assert.match(sync, /applyLimits\(user\.session_limits, now\);\s*if \(own\) touch\(now\);/);
  // Otro usuario: se recarga con su sesión, sin leaveSession (borraría su cookie) y sin logout.
  const otro = sync.slice(sync.indexOf("user.id !== userId"), sync.indexOf("const now"));
  assert.match(otro, /window\.location\.reload\(\)/);
  assert.doesNotMatch(otro, /leaveSession|logout|endSession/);
  assert.match(sinComentarios(leer("../../components/dashboard/DashboardShell.tsx")), /<IdleTimeout limits=\{user\.session_limits\} userId=\{user\.id\} \/>/);
});

// Ronda 2 de la revisión de riesgo de RC-311.

test("una pestaña que vuelve tras su tope de 8 h no cierra por el tope si otra mantiene una sesión sin confirmar (#2)", async () => {
  const quieta = await otraPestana("vuelve-tras-8h");
  const nueva = await otraPestana("sesion-nueva");
  const store = almacen();
  const H = 60 * MIN;
  // La quieta escribió su actividad a las 0 h y se suspendió. A las 7 h alguien entró de nuevo en otra pestaña.
  quieta.recordActivity(store, 1000);
  nueva.recordActivity(store, 8 * H + 5 * MIN);
  // A las 8 h 6 min la quieta se reanuda: su tope venció, pero la inactividad vive por la actividad ajena.
  const at = 8 * H + 6 * MIN;
  const idleLeft = 8 * H + 5 * MIN + IDLE - at;
  const absoluteLeft = 8 * H - at;
  assert.equal(quieta.mustConfirmBeforeMax(idleLeft, absoluteLeft, store, at, 1000, 0), true);
  // Ya preguntó a /auth/me después de esa actividad: el tope que tiene es el de la sesión vigente y cierra.
  assert.equal(quieta.mustConfirmBeforeMax(idleLeft, absoluteLeft, store, at, 1000, 8 * H + 5 * MIN + 1), false);
  // La última actividad es suya (una sola pestaña): cierra por el tope como siempre, sin preguntar.
  assert.equal(quieta.mustConfirmBeforeMax(idleLeft, absoluteLeft, store, at, 8 * H + 5 * MIN, 0), false);
  // Sin actividad de nadie en el plazo, o con el tope sin vencer, no hay nada que confirmar.
  assert.equal(quieta.mustConfirmBeforeMax(0, absoluteLeft, store, at, 1000, 0), false);
  assert.equal(quieta.mustConfirmBeforeMax(idleLeft, 1, store, at, 1000, 0), false);
  assert.equal(quieta.mustConfirmBeforeMax(idleLeft, absoluteLeft, null, at, 1000, 0), false);
});

test("IdleTimeout pregunta a /auth/me antes de cerrar por un tope que puede ser de la sesión anterior (#2)", () => {
  const codigo = sinComentarios(leer("../../components/IdleTimeout.tsx"));
  const tick = codigo.slice(codigo.indexOf("const tick = () =>"), codigo.indexOf("if (left <= 0)"));
  assert.match(
    tick,
    /if \(mustConfirmBeforeMax\(idleLeft, absoluteLeft, sharedStore\(\), at, lastShared\.current, confirmedAt\.current\)\) \{[\s\S]*?syncWithServer\(false\);[\s\S]*?return;\s*\}/,
  );
  const sync = codigo.slice(codigo.indexOf("const syncWithServer"), codigo.indexOf("useEffect("));
  // La respuesta confirma la sesión desde la hora en que salió la petición.
  assert.match(sync, /const sentAt = Date\.now\(\);/);
  assert.match(sync, /confirmedAt\.current = Math\.max\(confirmedAt\.current, sentAt\);/);
  assert.match(sync, /\.finally\(\(\) => \{\s*pending\.current -= 1;\s*\}\)/);
});

test("la consulta pasiva a /auth/me no cuenta como actividad ni la comparte (regresión 1 y 2 de la ronda 2)", () => {
  const codigo = sinComentarios(leer("../../components/IdleTimeout.tsx"));
  const sync = codigo.slice(codigo.indexOf("const syncWithServer"), codigo.indexOf("useEffect("));
  assert.match(sync, /getCurrentUser\(\{ passive: !own \}\)/);
  const auth = sinComentarios(leer("../../services/authService.ts"));
  assert.match(auth, /getCurrentUser\(\{ passive = false \}: \{ passive\?: boolean \} = \{\}\)/);
  assert.match(auth, /apiClient\.get<ApiUser>\("\/auth\/me", \{ passive \}\)/);
  const cliente = sinComentarios(leer("../apiClient.ts"));
  assert.match(cliente, /if \(!passive && typeof window !== "undefined" && isSessionProtected\(path\)\) window\.dispatchEvent\(new Event\(API_ACTIVITY_EVENT\)\);/);
  // passive no viaja a fetch.
  assert.match(cliente, /\{ body, headers, timeoutMs, passive, \.\.\.init \}: RequestOptions = \{\}/);
});
