"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  BAND_LABELS,
  CATEGORY_LABELS,
  FINDING_STATUS_LABELS,
  SEVERITY_LABELS,
  SOURCE_LABELS,
} from "@/config/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Band, Category, DomainFinding, FindingStatus, Report, Severity } from "@/types";

export interface ExecutiveReportData {
  domains: {
    fqdn: string;
    score: number | null;
    band: Band | null;
    last_scan_at: string | null;
    open_findings: Record<Severity, number>;
  }[];
  findings: { domain: string; finding: DomainFinding }[];
}

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const MARGIN = 14;

function categoryAction(finding: DomainFinding): string {
  if (finding.status === "resolved") return "Validar en el siguiente escaneo que la remediación siga aplicada.";
  if (finding.status === "accepted_risk") return "Revisar la vigencia de la aceptación y sus controles compensatorios.";
  if (finding.status === "false_positive") return "Conservar evidencia y confirmar el cierre en el siguiente escaneo.";

  if (finding.rule_code === "cert_expired") return `Renovar el certificado de ${finding.asset} o retirar el activo si ya no se usa.`;
  if (finding.rule_code === "outdated_software") return `Actualizar el software expuesto en ${finding.asset} y revisar sus componentes.`;
  if (finding.rule_code === "dmarc_missing") return `Publicar DMARC para ${finding.asset} y avanzar gradualmente a una política de rechazo.`;

  const actions: Record<Category, string> = {
    infrastructure: `Corregir la exposición de ${finding.asset}, aplicar parches y validar el servicio.`,
    digital_identity: `Verificar la titularidad de ${finding.asset} y retirar activos no autorizados.`,
    configuration: `Corregir la configuración de ${finding.asset} y validar el cambio en un nuevo escaneo.`,
    data_leaks: "Revocar las credenciales expuestas, forzar su rotación y exigir MFA.",
  };
  return actions[finding.category];
}

function isInPeriod(date: string | null, start: string, end: string): boolean {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= start && day <= end;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(28, 34, 48);
  doc.text(title, MARGIN, y);
  return y + 6;
}

export function ExecutiveReportDownload({ report, data }: { report: Report; data: ExecutiveReportData }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const download = () => {
    setBusy(true);
    setMessage("");

    try {
      const start = report.period_start.slice(0, 10);
      const end = report.period_end.slice(0, 10);
      const findings = data.findings
        .filter(({ finding }) => isInPeriod(finding.detected_at, start, end))
        .sort((a, b) => SEVERITY_RANK[a.finding.severity] - SEVERITY_RANK[b.finding.severity] || a.finding.detected_at.localeCompare(b.finding.detected_at));
      const openFindings = findings.filter(({ finding }) => finding.status === "open");
      const severityCounts = Object.fromEntries(SEVERITIES.map((severity) => [severity, findings.filter(({ finding }) => finding.severity === severity).length])) as Record<Severity, number>;
      const categoryCounts = Object.fromEntries(CATEGORIES.map((category) => [category, findings.filter(({ finding }) => finding.category === category).length])) as Record<Category, number>;
      const findingsByDomain = new Map(data.domains.map((domain) => [domain.fqdn, 0]));
      for (const { domain } of findings) findingsByDomain.set(domain, (findingsByDomain.get(domain) ?? 0) + 1);

      const affectedDomains = [...findingsByDomain.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
      const topCategory = CATEGORIES.toSorted((a, b) => categoryCounts[b] - categoryCounts[a])[0];
      const scannedDomains = data.domains.filter(({ last_scan_at }) => isInPeriod(last_scan_at, start, end)).length;
      const criticalHighOpen = openFindings.filter(({ finding }) => finding.severity === "critical" || finding.severity === "high").length;
      const newFindings = findings.filter(({ finding }) => finding.recurrence === "new").length;
      const recurringFindings = findings.filter(({ finding }) => finding.recurrence === "recurring").length;

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const periodLabel = `${formatDate(start)} - ${formatDate(end)}`;

      doc.setProperties({ title: "Resumen ejecutivo de riesgo - Lowtide", subject: periodLabel, creator: "Lowtide" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(28, 34, 48);
      doc.text("Resumen ejecutivo de riesgo", MARGIN, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(89, 101, 121);
      doc.text(`Periodo: ${periodLabel}`, MARGIN, 27);
      doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, MARGIN, 32);

      const metrics = [
        { label: "DOMINIOS ESCANEADOS", value: String(scannedDomains) },
        { label: "HALLAZGOS DETECTADOS", value: String(findings.length) },
        { label: "CRÍTICOS / ALTOS ABIERTOS", value: String(criticalHighOpen) },
        { label: "DOMINIOS AFECTADOS", value: String(affectedDomains.length) },
      ];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(28, 34, 48);
      doc.text("Indicadores clave", MARGIN, 39);
      metrics.forEach((metric, index) => {
        const rowY = 45 + index * 4.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(89, 101, 121);
        doc.text(metric.label, MARGIN, rowY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(28, 34, 48);
        doc.text(metric.value, pageWidth - MARGIN, rowY, { align: "right" });
        if (index < metrics.length - 1) {
          doc.setDrawColor(232, 235, 241);
          doc.line(MARGIN, rowY + 1.5, pageWidth - MARGIN, rowY + 1.5);
        }
      });

      let y = addSectionTitle(doc, "Lectura ejecutiva", 68);
      const insights = findings.length === 0
        ? ["No se detectaron hallazgos durante el periodo seleccionado."]
        : [
            criticalHighOpen > 0
              ? `${criticalHighOpen} hallazgo(s) crítico(s) o alto(s) siguen abiertos y requieren prioridad de remediación.`
              : "No hay hallazgos críticos o altos abiertos en el periodo.",
            affectedDomains[0]
              ? `${affectedDomains[0][0]} concentra más hallazgos detectados (${affectedDomains[0][1]}).`
              : "No hay dominios afectados en el periodo.",
            topCategory && categoryCounts[topCategory] > 0
              ? `${CATEGORY_LABELS[topCategory]} es la categoría más frecuente (${categoryCounts[topCategory]}).`
              : "No hay una categoría predominante.",
            `${newFindings} hallazgo(s) nuevo(s) y ${recurringFindings} recurrente(s) detectado(s).`,
          ];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      for (const insight of insights) {
        const lines = doc.splitTextToSize(`- ${insight}`, pageWidth - MARGIN * 2);
        doc.text(lines, MARGIN, y);
        y += lines.length * 4.2 + 2;
      }

      y = addSectionTitle(doc, "Riesgo y actividad por dominio", y + 3);
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN, bottom: 18 },
        head: [["Dominio", "Score reciente", "Escaneado", "Hallazgos del periodo", "Abiertos ahora"]],
        body: data.domains.map((domain) => [
          domain.fqdn,
          domain.score === null ? "-" : `${domain.score}${domain.band ? ` (${BAND_LABELS[domain.band]})` : ""}`,
          domain.last_scan_at ? formatDate(domain.last_scan_at.slice(0, 10)) : "Sin escaneo",
          String(findingsByDomain.get(domain.fqdn) ?? 0),
          String(SEVERITIES.reduce((total, severity) => total + domain.open_findings[severity], 0)),
        ]),
        theme: "grid",
        headStyles: { fillColor: [24, 39, 75], textColor: 255, fontSize: 7, fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.2, textColor: [45, 55, 72], overflow: "linebreak" },
        alternateRowStyles: { fillColor: [247, 248, 251] },
      });

      const afterDomains = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
      const distributionY = addSectionTitle(doc, "Distribución por severidad y categoría", afterDomains + 10);
      autoTable(doc, {
        startY: distributionY,
        margin: { left: MARGIN, right: MARGIN, bottom: 18 },
        head: [["Severidad", "Cantidad", "Categoría", "Cantidad"]],
        body: SEVERITIES.map((severity, index) => [
          SEVERITY_LABELS[severity],
          String(severityCounts[severity]),
          CATEGORY_LABELS[CATEGORIES[index]!],
          String(categoryCounts[CATEGORIES[index]!]),
        ]),
        theme: "grid",
        headStyles: { fillColor: [24, 39, 75], textColor: 255, fontSize: 7, fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.2, textColor: [45, 55, 72] },
        alternateRowStyles: { fillColor: [247, 248, 251] },
      });

      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(28, 34, 48);
      doc.text("Hallazgos y acciones recomendadas", MARGIN, 19);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(89, 101, 121);
      doc.text(`${findings.length} hallazgo(s) detectado(s) en ${periodLabel}`, MARGIN, 25);

      autoTable(doc, {
        startY: 31,
        margin: { left: MARGIN, right: MARGIN, top: 31, bottom: 18 },
        head: [["Dominio", "Severidad", "Hallazgo / activo / fuente", "Detectado", "Estado / acción recomendada"]],
        body: findings.length > 0
          ? findings.map(({ domain, finding }) => [
              domain,
              SEVERITY_LABELS[finding.severity],
              `${finding.title}\nActivo: ${finding.asset}\nFuente: ${SOURCE_LABELS[finding.source]}`,
              formatDate(finding.detected_at.slice(0, 10)),
              `${FINDING_STATUS_LABELS[finding.status as FindingStatus]}\n${categoryAction(finding)}`,
            ])
          : [["-", "-", "No se detectaron hallazgos en el periodo.", "-", "Sin acciones pendientes."]],
        columnStyles: {
          0: { cellWidth: 31 },
          1: { cellWidth: 20 },
          2: { cellWidth: 61 },
          3: { cellWidth: 24 },
          4: { cellWidth: 46 },
        },
        theme: "grid",
        headStyles: { fillColor: [24, 39, 75], textColor: 255, fontSize: 7, fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 7, cellPadding: 2.3, textColor: [45, 55, 72], overflow: "linebreak", valign: "top" },
        alternateRowStyles: { fillColor: [247, 248, 251] },
        rowPageBreak: "avoid",
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(112, 123, 142);
        doc.text(`Lowtide - Confidencial - ${page} / ${pageCount}`, pageWidth - MARGIN, pageHeight - 8, { align: "right" });
      }

      doc.save(`lowtide-resumen-ejecutivo-${start}-${end}.pdf`);
      setMessage("PDF descargado.");
    } catch {
      setMessage("No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end">
      <ActionButton variant="ghost" size="sm" loading={busy} onClick={download}>
        {!busy && <FileDown aria-hidden="true" className="h-3.5 w-3.5" />}
        Descargar
      </ActionButton>
      <span aria-live="polite" className="text-[11px] text-lt-muted">{message}</span>
    </span>
  );
}