// Tipos de activo (RC-118): el portal conoce los siete tipos de la base, api_doc incluido. node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ASSET_TYPE_LABELS } from "./labels.ts";

// Los del CHECK de assets.asset_type en BackKL db/migraciones/015_tipo_activo_api_doc.sql.
const TIPOS_DE_LA_BASE = ["domain", "subdomain", "ip", "service", "certificate", "email", "api_doc"];

test("1. cada tipo de activo de la base tiene su nombre en español", () => {
  assert.deepEqual(Object.keys(ASSET_TYPE_LABELS).sort(), [...TIPOS_DE_LA_BASE].sort());
  assert.equal(ASSET_TYPE_LABELS.api_doc, "Documentación de API");
});

test("2. el tipo AssetType del contrato acepta api_doc", () => {
  const tipos = readFileSync(new URL("../types/api.ts", import.meta.url), "utf8");
  const union = tipos.match(/export type AssetType = ([^;]+);/)[1];
  assert.deepEqual([...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort(), [...TIPOS_DE_LA_BASE].sort());
});
