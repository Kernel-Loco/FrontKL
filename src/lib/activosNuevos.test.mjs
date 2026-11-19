// Activos nuevos desde el último escaneo (#102, RC-219). node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { comparable, hasNewCertificate, isNewAsset, mapLimit, newAssetCounts, newAssetsText, scanBase } from "./activosNuevos.ts";

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

test("3. nuevo si first_seen_at cae entre queued_at y finished_at del último, como new_assets de la API", () => {
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
  assert.match(dashboard, /newAssetCounts\(\(await getDomainAssets\(s\.domain\)\)\.items, base\)/);
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
  // El /scans del dominio solo si el general no trae el anterior, y solo con el mismo último que la fecha del panel.
  assert.match(dashboard, /let base = scanBase\(scans\.items, s\.domain, scans\.total\);\s*if \(base\.unknown\) \{\s*const own = await getScans\(\{ domain: s\.domain, limit: 5 \}\);/);
  assert.match(dashboard, /if \(base\.last\?\.id !== shown\.id\) return \{ firstScan: false, newAssets: null \};/);
  // El inventario se lee solo si hay con qué comparar.
  assert.match(dashboard, /if \(!comparable\(base\)\) return \{ firstScan: base\.firstScan, newAssets: null \};\s*return \{ firstScan: false, newAssets: newAssetCounts\(\(await getDomainAssets/);
});
