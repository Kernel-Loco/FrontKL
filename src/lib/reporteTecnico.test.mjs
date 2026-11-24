// Reporte técnico en PDF (#46, RC-81) con el JSON de GET /domains/{fqdn}/report/technical. node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildTechnicalPdf, findingRows } from "./reporteEjecutivo.ts";

const LABELS = {
  severity: { critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo" },
  category: { infrastructure: "Infraestructura", digital_identity: "Identidad digital", configuration: "Configuración",
    data_leaks: "Fugas de datos" },
  band: { low: "Bajo", moderate: "Moderado", high: "Alto", critical: "Crítico" },
  source: { dns: "DNS", github: "GitHub", ct_logs: "crt.sh" },
  formatDate: (iso) => iso.slice(0, 10),
  scoreCell: (score, grade, band, partial) => `${score} ${grade} ${band}${partial ? " (parcial)" : ""}`,
};
const FW = {
  iso_27001_2022: { control_id: "A.8.12", control_name: "Prevención de fugas de datos" },
  cis_controls_v8_1: { safeguard_id: "3.11", safeguard_name: "Cifrado de datos sensibles en reposo" },
};
const HIBP = { source: "hibp", name: "Have I Been Pwned", url: "https://haveibeenpwned.com",
  license_url: "https://creativecommons.org/licenses/by/4.0/", text: "Datos de Have I Been Pwned bajo CC BY 4.0." };

function hallazgo(i, extra = {}) {
  return {
    id: `f${i}`, title: `Hallazgo ${i}`, severity: "high", base_severity: "medium", category: "configuration",
    rule_code: "dmarc_missing", asset: `a${i}.olmardo.com`, asset_type: "subdomain", source: "dns",
    detected_at: "2026-11-03T10:00:00Z", recurrence: "new", last_scan_id: "s1", cve_id: null, cvss: null, epss: null,
    in_kev: false, evidence: [{ key: "registro", value: "v=spf1 -all" }], meaning: "Cualquiera puede mandar correo a tu nombre.",
    recommendation: "Publica DMARC con p=none.", ...extra,
  };
}

function reporte(findings, { sources } = {}) {
  return {
    kind: "technical", domain: "olmardo.com", organization: "Grupo Olmardo", generated_at: "2026-11-20T12:00:00Z",
    authorization: { valid_from: "2026-10-19", valid_until: "2027-10-19" },
    score: { score: 64, band: "high", grade: "D", partial_coverage: false, computed_at: "2026-11-20T11:00:00Z" },
    last_scan_at: "2026-11-20T11:00:00Z",
    open_findings: { critical: 1, high: findings.length - 1, medium: 0, low: 0 },
    by_category: { infrastructure: 0, digital_identity: 0, configuration: findings.length, data_leaks: 0 },
    total_open: findings.length, findings, findings_omitted: 0, attributions: [HIBP],
    remediations: [{ rule_code: "secret_in_public_repo", title: "Secreto en un repositorio público", severity: "critical",
      category: "data_leaks", count: 1, assets: ["github.com/olmardo/web"], assets_omitted: 0,
      recommendation: "Revoca la llave. Bórrala del historial." }],
    sources: sources ?? [
      { source: "dns", status: "succeeded", attempt: 1, finished_at: "2026-11-20T11:00:00Z" },
      { source: "ct_logs", status: "failed", attempt: 3, finished_at: null },
    ],
  };
}

function texto(doc) {
  const partes = [...doc.output().matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return partes.join(" ").replace(/\s+/g, " ");
}

test("1. trae detalle, remediaciones, cobertura, marcos y atribución", () => {
  const crit = hallazgo(1, { severity: "critical", rule_code: "secret_in_public_repo", cve_id: "CVE-2026-1234", cvss: 9.8,
    epss: 0.42, in_kev: null, frameworks: FW });
  const t = texto(buildTechnicalPdf(reporte([crit, hallazgo(2)]), LABELS));
  for (const frase of [/Reporte t.cnico de riesgo/, /Cobertura del .ltimo escaneo/, /Remediaciones por regla/,
    /Detalle de hallazgos/, /1\. Hallazgo 1/, /2\. Hallazgo 2/, /CVE-2026-1234 - CVSS 9\.8 - EPSS 42\.0 % - En KEV: sin dato/,
    /Evidencia - registro/, /v=spf1 -all/, /Revoca la llave/, /Respondi/, /Fall/, /A\.8\.12/, /3\.11/,
    /Have I Been Pwned/, /64 D Alto/, /2026-10-19 a 2027-10-19/]) {
    assert.match(t, frase);
  }
});

test("2. las filas del hallazgo siguen el HTML de la API y sin mapeo no inventan marcos", () => {
  const filas = findingRows(hallazgo(1, { frameworks: FW }), LABELS).map(([k]) => k);
  assert.deepEqual(filas, ["Severidad", "Categoría", "Regla", "Activo", "Fuente", "Detectado", "Evidencia - registro",
    "ISO/IEC 27001:2022", "CIS Controls v8.1", "Qué significa", "Remediación"]);
  const sin = findingRows(hallazgo(2), LABELS).map(([k]) => k);
  assert.ok(!sin.includes("ISO/IEC 27001:2022") && !sin.includes("Vulnerabilidad"));
});

test("3. sin hallazgos ni escaneos lo dice, y 60 hallazgos paginan con pie en cada hoja", () => {
  const vacio = reporte([], { sources: [] });
  vacio.remediations = [];
  const t = texto(buildTechnicalPdf(vacio, LABELS));
  assert.match(t, /El dominio no tiene hallazgos abiertos\./);
  assert.match(t, /El dominio no tiene escaneos todav.a\./);
  const doc = buildTechnicalPdf(reporte(Array.from({ length: 60 }, (_, i) => hallazgo(i + 1))), LABELS);
  const paginas = doc.getNumberOfPages();
  assert.ok(paginas > 2);
  assert.match(texto(doc), new RegExp(`LowTide - Confidencial - ${paginas} / ${paginas}`));
});

test("4. el botón pide el técnico solo con technical, y las pantallas solo se lo dan a quien ve Hallazgos", () => {
  const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
  const boton = leer("../components/screens/shared/ReportButton.tsx");
  assert.match(boton, /\{technical && \(/);
  assert.match(boton, /getTechnicalReport/);
  for (const pagina of ["../app/(dashboard)/dashboard/dominios/[fqdn]/page.tsx", "../app/(dashboard)/dashboard/historico/page.tsx"]) {
    assert.match(leer(pagina), /<ReportButton [^>]*technical=\{canSeeFindings\}/, pagina);
  }
});
