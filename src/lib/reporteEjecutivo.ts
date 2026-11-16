// Reporte ejecutivo del dominio en PDF (#45, RC-70), de 1 a 2 páginas A4, con el JSON de GET /domains/{fqdn}/report.
// El HTML de la API (?formato=html) sale del mismo JSON: mismas cifras, mismos hallazgos y la atribución de HIBP.
// Sin imports con @/ de valores: las etiquetas, scoreCell y formatDate entran como parámetro, así node --test lo carga.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Band, Category, ExecutiveReport, Grade, Severity } from "@/types";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
export const CATEGORIES: Category[] = ["infrastructure", "digital_identity", "configuration", "data_leaks"];
export const MAX_PAGES = 2;
const MARGIN = 14;
const HEAD = { fillColor: [24, 39, 75] as [number, number, number], textColor: 255, fontSize: 7, fontStyle: "bold" as const };

export interface ReportLabels {
  severity: Record<Severity, string>;
  category: Record<Category, string>;
  band: Record<Band, string>;
  /** Etiqueta de cada fuente; una que no está sale con su código. */
  source: Record<string, string>;
  /** Fecha corta ("2026-11-15" o ISO → "15 nov 2026"). */
  formatDate: (iso: string) => string;
  /** Score, letra y banda en una celda, con el aviso de cobertura parcial. */
  scoreCell: (score: number | null, grade: Grade | null, band: string | null, partial: boolean) => string;
}

/** Las mismas frases de 'Lectura ejecutiva' que cirdan/reporte.py lectura(). */
export function insights(r: ExecutiveReport, labels: Pick<ReportLabels, "category">): string[] {
  if (r.total_open === 0) return ["El dominio no tiene hallazgos abiertos."];
  const high = r.open_findings.critical + r.open_findings.high;
  const out = [
    high
      ? `${high} ${high === 1 ? "hallazgo crítico o alto sigue abierto y requiere" : "hallazgos críticos o altos siguen abiertos y requieren"} prioridad de remediación.`
      : "No hay hallazgos críticos o altos abiertos.",
  ];
  const top = CATEGORIES.reduce((best, c) => ((r.by_category[c] ?? 0) > (r.by_category[best] ?? 0) ? c : best), CATEGORIES[0]!);
  out.push(`${labels.category[top]} es la categoría con más hallazgos abiertos (${r.by_category[top]}).`);
  if (r.findings_omitted === 0) {
    const nuevos = r.findings.filter((f) => f.recurrence === "new").length;
    out.push(`${nuevos} de los ${r.total_open} hallazgos abiertos aparecieron en el último escaneo.`);
  }
  return out;
}

function section(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(28, 34, 48);
  doc.text(title, MARGIN, y);
  return y + 5;
}

const lastY = (doc: jsPDF, fallback: number) => (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;

/** El PDF del reporte. No filtra por fechas: es el estado actual del dominio, como el HTML de la API. */
export function buildExecutivePdf(r: ExecutiveReport, labels: ReportLabels): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - MARGIN * 2;
  const bottom = 20;
  const table = { theme: "grid" as const, headStyles: HEAD, alternateRowStyles: { fillColor: [247, 248, 251] as [number, number, number] },
    margin: { left: MARGIN, right: MARGIN, bottom } };

  doc.setProperties({ title: `Resumen ejecutivo de riesgo - ${r.domain} - LowTide`, creator: "LowTide" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(28, 34, 48);
  doc.text("Resumen ejecutivo de riesgo", MARGIN, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(89, 101, 121);
  doc.text(doc.splitTextToSize(`Dominio: ${r.domain} - Empresa: ${r.organization} - Generado: ${labels.formatDate(r.generated_at)}`, width), MARGIN, 26);

  const s = r.score;
  let y = section(doc, "Indicadores clave", 35);
  autoTable(doc, {
    ...table,
    startY: y,
    body: [
      ["Score y letra", s ? labels.scoreCell(s.score, s.grade, labels.band[s.band], s.partial_coverage) : "Sin score todavía"],
      ["Hallazgos abiertos", String(r.total_open)],
      ["Críticos / altos abiertos", String(r.open_findings.critical + r.open_findings.high)],
      ["Último escaneo", r.last_scan_at ? labels.formatDate(r.last_scan_at) : "Sin fecha"],
      ["Autorización vigente", `${labels.formatDate(r.authorization.valid_from)} a ${labels.formatDate(r.authorization.valid_until)}`],
    ],
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.8, textColor: [45, 55, 72], overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 52, fontStyle: "bold" } },
  });

  y = section(doc, "Lectura ejecutiva", lastY(doc, y) + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  for (const line of insights(r, labels)) {
    const lines = doc.splitTextToSize(`- ${line}`, width);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4 + 1.5;
  }

  y = section(doc, "Hallazgos abiertos por severidad y categoría", y + 4);
  autoTable(doc, {
    ...table,
    startY: y,
    head: [["Severidad", "Cantidad", "Categoría", "Cantidad"]],
    body: SEVERITIES.map((sev, i) => [labels.severity[sev], String(r.open_findings[sev]), labels.category[CATEGORIES[i]!],
      String(r.by_category[CATEGORIES[i]!])]),
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.8, textColor: [45, 55, 72] },
  });

  y = section(doc, "Hallazgos principales y acción recomendada", lastY(doc, y) + 8);
  autoTable(doc, {
    ...table,
    startY: y,
    head: [["Severidad", "Hallazgo / activo / fuente", "Detectado", "Acción recomendada"]],
    body: r.findings.length > 0
      ? r.findings.map((f) => [
          labels.severity[f.severity] ?? f.severity,
          `${f.title}\nActivo: ${f.asset}\nFuente: ${labels.source[f.source] ?? f.source}`,
          labels.formatDate(f.detected_at),
          f.action || "-",
        ])
      : [["-", "El dominio no tiene hallazgos abiertos.", "-", "-"]],
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 72 }, 2: { cellWidth: 22 }, 3: { cellWidth: 70 } },
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.8, textColor: [45, 55, 72], overflow: "linebreak", valign: "top" },
    rowPageBreak: "avoid",
  });
  y = lastY(doc, y);

  const notes: string[] = [];
  if (r.findings_omitted > 0) {
    notes.push(`Y ${r.findings_omitted} hallazgos abiertos más, de menor severidad. La lista completa está en la exportación de hallazgos del portal.`);
  }
  for (const a of r.attributions) notes.push(`${a.text} Licencia: ${a.license_url}.`);
  notes.push("LowTide - Confidencial. Solo observación pasiva de fuentes públicas, con autorización firmada del dominio.");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(89, 101, 121);
  const blocks = notes.map((n) => doc.splitTextToSize(n, width) as string[]);
  const needed = 10 + blocks.reduce((total, b) => total + b.length * 3.4 + 1.5, 0);
  if (y + needed > pageHeight - bottom) {
    doc.addPage();
    y = 14;
  }
  y = section(doc, "Fuentes y atribuciones", y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(89, 101, 121);
  for (const b of blocks) {
    doc.text(b, MARGIN, y);
    y += b.length * 3.4 + 1.5;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(112, 123, 142);
    doc.text(`LowTide - Confidencial - ${page} / ${pages}`, pageWidth - MARGIN, pageHeight - 8, { align: "right" });
  }
  return doc;
}
