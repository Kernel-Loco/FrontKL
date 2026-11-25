// Activos nuevos desde el último escaneo (#102, RC-219). node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  comparable, hasNewCertificate, isNewAsset, mapLimit, newAssetCounts, newAssetsText, panelAssets, sameClose, scanBase,
} from "./activosNuevos.ts";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const D = "acme-demo.mx";
const scan = (id, status, queued, finished, domain = D) => ({
  id, domain, trigger: "scheduled", status, queued_at: queued, finished_at: finished, stats: null, sources: [],
});
const asset = (type, value, firstSeen, attributes = {}) => ({
  id: value, type, value, parent: null, attributes, first_seen_at: firstSeen, last_seen_at: firstSeen,
});
const ULTIMO = scan("s3", "completed", "2026-11-18T10:00:00Z", "2026-11-18T10:05:00Z");
const ANTERIOR = scan("s2", "partial", "2026-11-11T10:00:00Z", "2026-11-11T10:04:00Z");

test("1. el último terminado y el anterior que sí corrió; el fallido no es base y el en curso se salta", () => {
  const corriendo = scan("s4", "running", "2026-11-18T12:00:00Z", null);
  const fallido = scan("sf", "failed", "2026-11-15T10:00:00Z", "2026-11-15T10:01:00Z");
  const otro = scan("x", "completed", "2026-11-17T10:00:00Z", "2026-11-17T10:01:00Z", "otro.mx");
  const base = scanBase([corriendo, ULTIMO, otro, fallido, ANTERIOR], D);
  assert.equal(base.last.id, "s3");
  assert.equal(base.previous.id, "s2");
  assert.equal(base.firstScan, false);
});

test("2. primer escaneo: sin anterior y sin más escaneos que leer; con más en la API no se sabe", () => {
  assert.deepEqual([scanBase([ULTIMO], D).firstScan, scanBase([ULTIMO], D).unknown], [true, false]);
  assert.deepEqual([scanBase([ULTIMO], D, 9).firstScan, scanBase([ULTIMO], D, 9).unknown], [false, true]);
  assert.equal(scanBase([], D).firstScan, false);
});

test("3. sin fallidos de en medio, nuevo si first_seen_at cae entre queued_at y finished_at del último (como new_assets)", () => {
  const base = scanBase([ULTIMO, ANTERIOR], D);
  assert.equal(base.since, ULTIMO.queued_at);
  assert.equal(isNewAsset(asset("subdomain", "a", "2026-11-18T10:00:00Z"), base), true);
  assert.equal(isNewAsset(asset("subdomain", "b", "2026-11-18T10:05:00Z"), base), true);
  assert.equal(isNewAsset(asset("subdomain", "c", "2026-11-18T09:59:59Z"), base), false);
  assert.equal(isNewAsset(asset("subdomain", "d", "2026-11-18T12:01:00Z"), base), false); // de un escaneo en curso
  assert.equal(isNewAsset(asset("subdomain", "e", "no es fecha"), base), false);
  assert.equal(isNewAsset(asset("subdomain", "f", "2026-11-18T10:01:00Z"), { last: null, since: null }), false);
});

test("4. certificado nuevo: 'emitido' después del inicio del anterior y hasta el cierre del último", () => {
  const base = { last: ULTIMO, previous: ANTERIOR };
  const viejo = "2026-11-01T10:00:00Z";
  assert.equal(hasNewCertificate(asset("subdomain", "www", viejo, { emitido: "2026-11-12T00:00:00+00:00" }), base), true);
  assert.equal(hasNewCertificate(asset("domain", D, viejo, { emitido: "2026-11-12T00:00:00+00:00" }), base), true);
  assert.equal(hasNewCertificate(asset("subdomain", "api", viejo, { emitido: "2026-11-10T00:00:00+00:00" }), base), false);
  assert.equal(hasNewCertificate(asset("subdomain", "sin", viejo, {}), base), false);
  assert.equal(hasNewCertificate(asset("ip", "198.51.100.10", viejo, { emitido: "2026-11-12T00:00:00Z" }), base), false);
  assert.equal(hasNewCertificate(asset("subdomain", "www", viejo, { emitido: "2026-11-12T00:00:00Z" }), { last: ULTIMO, previous: null }), false);
});

test("5. conteos por tipo; primer escaneo, base desconocida y último fallido dan null", () => {
  const nuevo = "2026-11-18T10:02:00Z";
  const viejo = "2026-11-01T10:00:00Z";
  const assets = [
    asset("domain", D, viejo, { emitido: "2026-11-12T00:00:00+00:00" }),
    asset("subdomain", "api.acme-demo.mx", nuevo, { emitido: "2026-11-17T00:00:00+00:00" }),
    asset("subdomain", "www.acme-demo.mx", viejo, { emitido: "2026-10-01T00:00:00+00:00" }),
    asset("ip", "198.51.100.10", nuevo),
    asset("ip", "198.51.100.11", viejo),
    asset("service", "198.51.100.10:443/tcp", nuevo),
    asset("service", "198.51.100.10:22/tcp", nuevo),
    asset("certificate", "abc", nuevo),
    asset("email", "ti@acme-demo.mx", nuevo),
  ];
  const base = scanBase([ULTIMO, ANTERIOR], D);
  assert.deepEqual(newAssetCounts(assets, base), { subdomains: 1, ips: 1, ports: 2, certificates: 3 });
  assert.equal(newAssetsText({ subdomains: 1, ips: 2, ports: 0, certificates: 1 }), "1 subdominio · 2 IP · 0 puertos · 1 certificado");
  assert.equal(newAssetCounts(assets, scanBase([ULTIMO], D)), null);
  assert.equal(newAssetCounts(assets, scanBase([ULTIMO], D, 9)), null);
  const fallido = scan("s5", "failed", "2026-11-19T10:00:00Z", "2026-11-19T10:01:00Z");
  assert.equal(newAssetCounts(assets, scanBase([fallido, ULTIMO, ANTERIOR], D)), null);
});

test("6. el panel dice 'primer escaneo' y no cuenta; el detalle no marca nada en el primer escaneo", () => {
  const panel = leer("../components/screens/dashboard/RecentChanges.tsx");
  assert.match(panel, /s\.firstScan \? \(\s*"Activos: primer escaneo"/);
  assert.match(panel, /newAssetsText\(s\.newAssets\)/);
  const tarjeta = leer("../components/screens/detalle/AssetsCard.tsx");
  assert.match(tarjeta, /const marks = comparable\(base\) \? base : null;/);
  assert.match(tarjeta, /<Badge tone="green">Nuevo<\/Badge>/);
  assert.match(tarjeta, /<Badge tone="teal">Certificado nuevo<\/Badge>/);
  const detalle = leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.match(detalle, /<AssetsCard assets=\{assets\.items\} base=\{scans \? scanBase\(scans\.items, fqdn, scans\.total\) : null\} \/>/);
  const dashboard = leer("../app/(dashboard)/dashboard/page.tsx");
  assert.match(dashboard, /async \(fqdn\) => \(await getDomainAssets\(fqdn\)\)\.items,/);
});

// Ronda de arreglos 1 (18 nov): hallazgos 1, 2, 3, 4 y 7 de la revisión del commit d71d0c9.
const FALLIDO = scan("s5", "failed", "2026-11-19T10:00:00Z", "2026-11-19T10:01:00Z");

test("7. hallazgo 1: con el último fallido el detalle no marca 'Nuevo', igual que el panel", () => {
  const base = scanBase([FALLIDO, ULTIMO, ANTERIOR], D);
  assert.equal(base.last.id, "s5");
  assert.equal(comparable(base), false);
  assert.equal(comparable(scanBase([ULTIMO, ANTERIOR], D)), true);
  assert.equal(comparable(null), false);
  // Lo que el fallido llegó a guardar no sale como nuevo en el detalle ni cuenta en el panel.
  assert.equal(newAssetCounts([asset("subdomain", "x", "2026-11-19T10:00:30Z")], base), null);
  const tarjeta = leer("../components/screens/detalle/AssetsCard.tsx");
  assert.doesNotMatch(tarjeta, /base\?\.last && base\.previous/);
  assert.match(tarjeta, /isNewAsset\(a, marks\) && <Badge tone="green">Nuevo<\/Badge>/);
});

test("8. hallazgo 2: si el último falló no es 'primer escaneo', aunque los anteriores también fallaran", () => {
  const viejo = scan("s0", "failed", "2026-11-01T10:00:00Z", "2026-11-01T10:01:00Z");
  for (const lista of [[FALLIDO], [FALLIDO, viejo], [FALLIDO, ULTIMO]]) {
    const base = scanBase(lista, D);
    assert.deepEqual([base.firstScan, base.unknown], [false, false]);
  }
  assert.deepEqual([scanBase([FALLIDO, viejo], D, 9).firstScan, scanBase([FALLIDO, viejo], D, 9).unknown], [false, false]);
  // El primero que sí corrió después de puros fallidos es el primer escaneo: no cuenta todo como nuevo.
  const base = scanBase([ULTIMO, viejo], D);
  assert.deepEqual([base.firstScan, base.unknown, base.previous], [true, false, null]);
  assert.equal(newAssetCounts([asset("subdomain", "a", "2026-11-18T10:02:00Z")], base), null);
});

test("9. hallazgo 3: lo que guardó un fallido de en medio cuenta como nuevo en el siguiente que sí corrió", () => {
  const enMedio = scan("sf", "failed", "2026-11-15T10:00:00Z", "2026-11-15T10:01:00Z");
  const base = scanBase([ULTIMO, enMedio, ANTERIOR], D);
  assert.deepEqual([base.last.id, base.previous.id, base.since], ["s3", "s2", enMedio.queued_at]);
  const assets = [
    asset("subdomain", "del-fallido.acme-demo.mx", "2026-11-15T10:00:30Z"),
    asset("ip", "198.51.100.20", "2026-11-18T10:01:00Z"),
    asset("subdomain", "del-anterior.acme-demo.mx", "2026-11-11T10:02:00Z"),
    asset("subdomain", "antes-del-fallido.acme-demo.mx", "2026-11-15T09:59:59Z"),
  ];
  assert.deepEqual(assets.map((a) => isNewAsset(a, base)), [true, true, false, false]);
  assert.deepEqual(newAssetCounts(assets, base), { subdomains: 1, ips: 1, ports: 0, certificates: 0 });
});

test("10. hallazgo 4: un certificado con varios nombres en el SAN cuenta una vez", () => {
  const base = scanBase([ULTIMO, ANTERIOR], D);
  const viejo = "2026-11-01T10:00:00Z";
  const san = (nombre, emitido) => asset("subdomain", nombre, viejo, { emitido });
  // Mismo certificado en 3 nombres (el mismo instante, escrito con +00:00 o con Z) y otro distinto.
  const assets = [
    san("a.acme-demo.mx", "2026-11-12T00:00:00+00:00"),
    san("b.acme-demo.mx", "2026-11-12T00:00:00+00:00"),
    asset("domain", D, viejo, { emitido: "2026-11-12T00:00:00Z" }),
    san("c.acme-demo.mx", "2026-11-13T08:30:00+00:00"),
    san("d.acme-demo.mx", "2026-11-01T00:00:00+00:00"),
  ];
  assert.equal(newAssetCounts(assets, base).certificates, 2);
  // Un activo 'certificate' nuevo cuenta aparte por su valor, una vez aunque se repita.
  const cert = asset("certificate", "abc", "2026-11-18T10:02:00Z");
  assert.equal(newAssetCounts([...assets, cert, cert], base).certificates, 3);
});

test("11. hallazgo 7: mapLimit respeta el tope y el orden; el dashboard reusa el /scans general", async () => {
  let activos = 0;
  let maximo = 0;
  const salida = await mapLimit([5, 1, 4, 2, 3, 0, 6], 3, async (n, i) => {
    activos += 1;
    maximo = Math.max(maximo, activos);
    await new Promise((r) => setTimeout(r, n));
    activos -= 1;
    return `${i}:${n}`;
  });
  assert.deepEqual(salida, ["0:5", "1:1", "2:4", "3:2", "4:3", "5:0", "6:6"]);
  assert.equal(maximo, 3);
  assert.deepEqual(await mapLimit([], 4, async () => 1), []);
  await assert.rejects(mapLimit([1], 4, async () => { throw new Error("falla"); }), /falla/);
  const dashboard = leer("../app/(dashboard)/dashboard/page.tsx");
  assert.match(dashboard, /await mapLimit\(summaries, 4, async \(s\) => \{/);
  assert.doesNotMatch(dashboard, /Promise\.all\(\[getScans\(\{ domain/);
  // El /scans del dominio y el inventario los decide panelAssets (prueba 12), dentro del mismo tope.
  assert.match(dashboard, /await mapLimit\(summaries, 4, async \(s\) => \{\s*try \{\s*return await panelAssets\(\s*s,\s*scans,\s*\(fqdn\) => getScans\(\{ domain: fqdn, limit: 5 \}\),/);
  assert.match(dashboard, /if \(error instanceof ServiceError\) return \{ firstScan: false, newAssets: null \};/);
});

// Ronda de arreglos 2 (19 nov): el dominio con score fuera de los 50 vuelve a contar, y since con 2 fallidos de en medio.
const lista = (items, total = items.length) => ({ items, total });
const fuente = (porDominio) => {
  const llamadas = { scans: [], assets: [] };
  return {
    llamadas,
    scans: async (fqdn) => { llamadas.scans.push(fqdn); return porDominio[fqdn] ?? lista([]); },
    assets: async (fqdn) => { llamadas.assets.push(fqdn); return [asset("subdomain", "api.acme-demo.mx", "2026-11-18T10:02:00Z")]; },
  };
};
const UNO = { subdomains: 1, ips: 0, ports: 0, certificates: 0 };
// El orquestador guarda last_scan_at con otro clock_timestamp() justo después del finished_at del escaneo.
const CIERRE = "2026-11-18T10:05:00.004Z";

test("12. dashboard: un dominio con score cuyo último escaneo no está en los 50 de la empresa también cuenta", async () => {
  const otros = lista([scan("x", "completed", "2026-11-19T10:00:00Z", "2026-11-19T10:01:00Z", "otro.mx")], 80);
  // Fuera de los 50: lee los 5 del dominio y los usa porque su último cerró con el last_scan_at que muestra el panel.
  let f = fuente({ [D]: lista([ULTIMO, ANTERIOR], 7) });
  assert.deepEqual(await panelAssets({ domain: D, finishedAt: CIERRE }, otros, f.scans, f.assets), { firstScan: false, newAssets: UNO });
  assert.deepEqual([f.llamadas.scans, f.llamadas.assets], [[D], [D]]);
  // Primer escaneo del dominio, también fuera de los 50.
  f = fuente({ [D]: lista([ULTIMO]) });
  assert.deepEqual(await panelAssets({ domain: D, finishedAt: CIERRE }, otros, f.scans, f.assets), { firstScan: true, newAssets: null });
  assert.deepEqual(f.llamadas.assets, []);
  // Sin fecha en el panel no hay con qué emparejar: ni se lee.
  f = fuente({ [D]: lista([ULTIMO, ANTERIOR]) });
  assert.deepEqual(await panelAssets({ domain: D, finishedAt: null }, otros, f.scans, f.assets), { firstScan: false, newAssets: null });
  assert.deepEqual([f.llamadas.scans, f.llamadas.assets], [[], []]);
  // Su último no es el de la fecha del panel (uno más nuevo que falló sin tocar last_scan_at, o una fecha de otro
  // cierre): sin conteos y sin leer el inventario.
  for (const [propios, fecha] of [
    [[FALLIDO, ULTIMO, ANTERIOR], CIERRE],
    [[ULTIMO, ANTERIOR], "2026-11-11T10:04:00.003Z"],
    [[ULTIMO, ANTERIOR], "2026-11-18T10:04:59Z"],
    [[ULTIMO, ANTERIOR], "2026-11-18T10:06:00.001Z"],
  ]) {
    f = fuente({ [D]: lista(propios) });
    assert.deepEqual(await panelAssets({ domain: D, finishedAt: fecha }, otros, f.scans, f.assets), { firstScan: false, newAssets: null });
    assert.deepEqual(f.llamadas.assets, []);
  }
  assert.deepEqual([sameClose(ULTIMO.finished_at, ULTIMO.finished_at), sameClose(ULTIMO.finished_at, "2026-11-18T10:06:00Z")], [true, true]);
  assert.deepEqual([sameClose(null, CIERRE), sameClose(ULTIMO.finished_at, "no es fecha")], [false, false]);
  // Dentro de los 50 con su anterior: no lee el /scans del dominio. Sin el anterior: lo lee y exige el mismo último.
  f = fuente({});
  const general = lista([ULTIMO, ANTERIOR], 80);
  assert.deepEqual(await panelAssets({ domain: D, finishedAt: ULTIMO.finished_at }, general, f.scans, f.assets), { firstScan: false, newAssets: UNO });
  assert.deepEqual(f.llamadas.scans, []);
  f = fuente({ [D]: lista([ULTIMO, ANTERIOR], 7) });
  assert.deepEqual(await panelAssets({ domain: D, finishedAt: ULTIMO.finished_at }, lista([ULTIMO], 80), f.scans, f.assets), { firstScan: false, newAssets: UNO });
  f = fuente({ [D]: lista([FALLIDO, ULTIMO, ANTERIOR], 7) });
  assert.deepEqual(await panelAssets({ domain: D, finishedAt: ULTIMO.finished_at }, lista([ULTIMO], 80), f.scans, f.assets), { firstScan: false, newAssets: null });
});

test("13. since con 2 fallidos de en medio: el queued_at del más viejo, no del más nuevo (se aparta de new_assets)", () => {
  const nuevo = scan("sf2", "failed", "2026-11-16T10:00:00Z", "2026-11-16T10:01:00Z");
  const viejo = scan("sf1", "failed", "2026-11-14T10:00:00Z", "2026-11-14T10:01:00Z");
  const base = scanBase([ULTIMO, nuevo, viejo, ANTERIOR], D);
  assert.deepEqual([base.last.id, base.previous.id, base.since], ["s3", "s2", viejo.queued_at]);
  const assets = [
    asset("subdomain", "del-fallido-viejo.acme-demo.mx", "2026-11-14T10:00:30Z"),
    asset("subdomain", "del-fallido-nuevo.acme-demo.mx", "2026-11-16T10:00:30Z"),
    asset("subdomain", "entre-anterior-y-fallido.acme-demo.mx", "2026-11-13T10:00:00Z"),
  ];
  assert.deepEqual(assets.map((a) => isNewAsset(a, base)), [true, true, false]);
  assert.deepEqual(newAssetCounts(assets, base), { subdomains: 2, ips: 0, ports: 0, certificates: 0 });
});
