// RC-232: la letra del PDF sale del reporte ejecutivo de la API (RC-70), no de una fila simulada. node --test, sin red.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mockReports } from "../mocks/api/provisional.ts";

test("1. la lista simulada de reportes ya no trae un PDF", () => {
  assert.equal(mockReports.items.filter((r) => r.kind === "pdf_report").length, 0);
  assert.equal(mockReports.total, mockReports.items.length);
});

test("2. el PDF del portal se arma con GET /domains/{fqdn}/report", () => {
  const boton = readFileSync(new URL("../components/screens/shared/ReportButton.tsx", import.meta.url), "utf8");
  assert.match(boton, /getExecutiveReport/);
  assert.match(boton, /buildExecutivePdf/);
  const servicio = readFileSync(new URL("../services/reportService.ts", import.meta.url), "utf8");
  assert.match(servicio, /apiClient\.get<ExecutiveReport>\(`\/domains\/\$\{encodeURIComponent\(domain\)\}\/report`/);
});
