// Activos nuevos desde el último escaneo (#102, RC-219). node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { hasNewCertificate, isNewAsset, newAssetCounts, newAssetsText, scanBase } from "./activosNuevos.ts";

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
  assert.equal(isNewAsset(asset("subdomain", "a", "2026-11-18T10:00:00Z"), ULTIMO), true);
  assert.equal(isNewAsset(asset("subdomain", "b", "2026-11-18T10:05:00Z"), ULTIMO), true);
  assert.equal(isNewAsset(asset("subdomain", "c", "2026-11-18T09:59:59Z"), ULTIMO), false);
  assert.equal(isNewAsset(asset("subdomain", "d", "2026-11-18T12:01:00Z"), ULTIMO), false); // de un escaneo en curso
  assert.equal(isNewAsset(asset("subdomain", "e", "no es fecha"), ULTIMO), false);
  assert.equal(isNewAsset(asset("subdomain", "f", "2026-11-18T10:01:00Z"), null), false);
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
  assert.match(tarjeta, /const marks = base\?\.last && base\.previous \? base : null;/);
  assert.match(tarjeta, /<Badge tone="green">Nuevo<\/Badge>/);
  assert.match(tarjeta, /<Badge tone="teal">Certificado nuevo<\/Badge>/);
  const detalle = leer("../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx");
  assert.match(detalle, /<AssetsCard assets=\{assets\.items\} base=\{scans \? scanBase\(scans\.items, fqdn, scans\.total\) : null\} \/>/);
  const dashboard = leer("../app/(dashboard)/dashboard/page.tsx");
  assert.match(dashboard, /getScans\(\{ domain: s\.domain, limit: 5 \}\), getDomainAssets\(s\.domain\)/);
});
