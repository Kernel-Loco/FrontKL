// Prueba sin red (#82, RC-117): .github/workflows/imagenes.yml escanea la imagen del portal con Trivy y frena con
// críticas, saca su SBOM con Syft y solo en un push la sube a ghcr.io y la firma con cosign por digest. Si alguien
// quita un paso, baja el nivel o firma en un PR, esta prueba falla.
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const raiz = new URL("../../", import.meta.url);
const flujo = readFileSync(new URL(".github/workflows/imagenes.yml", raiz), "utf8").replace(/\r\n/g, "\n");
const pasos = flujo.split(/^\s{6}- /m);
const paso = (nombre) => {
  const encontrado = pasos.find((p) => p.startsWith(`name: ${nombre}`));
  assert.ok(encontrado, `falta el paso '${nombre}'`);
  return encontrado;
};

test("Trivy frena con vulnerabilidades críticas en la imagen del portal", () => {
  const trivy = paso("Trivy frena con vulnerabilidades críticas");
  for (const opcion of ["--severity CRITICAL", "--exit-code 1", "lowtide-portal:ci"]) assert.ok(trivy.includes(opcion), opcion);
});

test("el portal se compila con la misma API_INTERNAL_URL del despliegue", () => {
  assert.ok(paso("Compilar la imagen").includes("--build-arg API_INTERNAL_URL=http://api:8000"));
});

test("Syft saca el SBOM en SPDX y la corrida lo guarda", () => {
  assert.ok(paso("SBOM con Syft").includes("-o spdx-json="));
  assert.match(flujo, /name: sbom-frontkl/);
});

test("subir, firmar y atestar solo en push y por digest", () => {
  const firma = paso("Subir a ghcr.io, firmar y atestar el SBOM");
  assert.ok(firma.includes("if: github.event_name == 'push'"));
  assert.ok(firma.includes('imagetools inspect "$IMAGEN:$GITHUB_SHA"'));
  assert.ok(firma.includes('digest="$IMAGEN@$sha"'));
  assert.ok(!firma.includes("RepoDigests"));
  assert.ok(firma.includes('cosign sign --yes "$digest"'));
  assert.ok(firma.includes("cosign attest --yes --type spdxjson"));
  for (const otro of pasos.filter((p) => !p.startsWith("name: Subir a ghcr.io"))) {
    assert.doesNotMatch(otro, /docker push|GITHUB_TOKEN/);
  }
});

test("permisos de escritura solo en el job y herramientas con versión fija", () => {
  assert.match(flujo, /^permissions:\n\s+contents: read\n/m);
  assert.equal(flujo.match(/packages: write/g)?.length, 1);
  assert.equal(flujo.match(/id-token: write/g)?.length, 1);
  for (const nombre of ["TRIVY", "SYFT", "COSIGN"]) {
    assert.match(flujo, new RegExp(`^  ${nombre}: \\S+:v?\\d+\\.\\d+\\.\\d+$`, "m"), nombre);
  }
});
