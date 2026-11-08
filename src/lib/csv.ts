// CSV para Excel en español (#24, RC-57): UTF-8 con BOM, fin de línea CRLF y celdas escapadas.
// Títulos, banners y evidencia vienen de sitios ajenos: Excel toma como fórmula el texto que empieza con
// =, +, -, @, tabulador o retorno de carro. Se le antepone una comilla, igual que en la API de BackKL
// (cirdan/exportar.py, OWASP CSV Injection). Solo al texto: un número negativo sigue siendo número.
// Excel con separador de lista ';' (es-ES, es-CO, es-AR) o LibreOffice con ';' o tabulador parten la celda ahí:
// también lleva comilla lo que sigue a un ';', un tabulador o un salto de línea, y esa celda va entre comillas.

const FORMULA_START = /^[=+\-@\t\r]/;
// Las comillas dobles de en medio no cuentan: en x;"=cmd Excel cierra la comilla vacía y deja =cmd.
const AFTER_SEPARATOR = /([;\t\r\n])(?="*[=+\-@\t\r])/g;
const NEEDS_QUOTES = /[",;\t\r\n]/;

export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  const isText = typeof value === "string" || (typeof value === "object" && value !== null);
  const escaped = isText ? raw.replace(AFTER_SEPARATOR, "$1'") : raw;
  const text = typeof value === "string" && FORMULA_START.test(escaped) ? `'${escaped}` : escaped;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Columnas en el orden en que aparecen por primera vez y el texto del archivo con BOM. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  return `﻿${lines.join("\r\n")}`;
}
