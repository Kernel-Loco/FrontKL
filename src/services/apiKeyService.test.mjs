import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./apiKeyService.ts", import.meta.url), "utf8");

function serviceWith(client) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.equal(name, "@/lib/apiClient");
      return { apiClient: client };
    },
  });
  return exports;
}

test("crea la llave con el contrato real y conserva la respuesta de una sola vez", async () => {
  const request = { name: "SIEM", domain: "acme.mx", expires_in_days: 30, own_use: true };
  const response = { id: "1", domain: "acme.mx", scopes: ["read"], key: "CIRDAN_FAKE_secret" };
  const service = serviceWith({
    post: async (path, body) => {
      assert.equal(path, "/api-keys");
      assert.equal(body, request);
      return response;
    },
  });
  assert.equal(await service.createApiKey(request), response);
  assert.deepEqual(Object.keys(request), ["name", "domain", "expires_in_days", "own_use"]);
});

test("revoca con DELETE y propaga errores sin inventar una respuesta", async () => {
  const failure = new Error("No disponible");
  const service = serviceWith({
    delete: async (path) => {
      assert.equal(path, "/api-keys/id%2F1");
      throw failure;
    },
  });
  await assert.rejects(service.revokeApiKey("id/1"), (error) => error === failure);
  const success = serviceWith({ delete: async () => undefined });
  assert.equal(await success.revokeApiKey("1"), undefined);
});

test("las lecturas y la pantalla usan el alcance real y no se anuncian como simuladas", () => {
  const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
  const screen = read("../components/screens/admin/ApiKeysManager.tsx");
  const page = read("../app/(dashboard)/dashboard/admin/api/page.tsx");
  assert.match(read("./queries.ts"), /apiGet<ListResponse<ApiKey>>\("\/api-keys"\)/);
  assert.match(screen, /domain: String\(data\.get\("domain"\) \?\? ""\) \|\| null/);
  assert.match(screen, /own_use: true/);
  assert.match(screen, /const \{ key, \.\.\.created \}/);
  assert.match(screen, /await revokeApiKey\(id\)/);
  assert.doesNotMatch(screen, /API_SCOPES|scans:write/);
  assert.doesNotMatch(page, /AvisoSimulado/);
});
