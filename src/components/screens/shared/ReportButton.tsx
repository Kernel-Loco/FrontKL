"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode, FileDown } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { BAND_LABELS, CATEGORY_LABELS, SEVERITY_LABELS, SOURCE_LABELS } from "@/config/labels";
import { formatDate } from "@/lib/format";
import { buildExecutivePdf, buildTechnicalPdf, type ReportLabels } from "@/lib/reporteEjecutivo";
import { scoreCell } from "@/lib/riesgo";
import { getErrorMessage } from "@/services/errors";
import { downloadExecutiveHtml, downloadTechnicalHtml, getExecutiveReport, getTechnicalReport } from "@/services/reportService";

interface ReportButtonProps {
  domain: string;
  /** Sin carta vigente no se puede exportar (exportBlockReasons). */
  disabledReason?: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
  /** Muestra también el reporte técnico (#46, RC-81). Solo a quien ve Hallazgos: la API le da 403 al gerente. */
  technical?: boolean;
}

type Kind = "pdf" | "html" | "tpdf" | "thtml";

const LABELS: ReportLabels = {
  severity: SEVERITY_LABELS,
  category: CATEGORY_LABELS,
  band: BAND_LABELS,
  source: SOURCE_LABELS,
  formatDate,
  scoreCell,
};

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Reporte ejecutivo del dominio (#45, RC-70) en PDF y en HTML, y con `technical` el técnico (#46, RC-81), con el estado actual de la API. Sin autorización
 * firmada vigente la API responde 403 y ese mensaje se muestra tal cual. Úsalo con key={domain}: el estado (mensaje y
 * descarga en curso) es de un dominio, y al cambiar de dominio el botón anterior se desmonta y aborta su petición.
 */
export function ReportButton({ domain, disabledReason, variant = "secondary", size = "md", technical = false }: ReportButtonProps) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async (format: Kind) => {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(format);
    setMessage(null);
    try {
      if (format === "html") {
        const blob = await downloadExecutiveHtml(domain, current.signal);
        if (!current.signal.aborted) saveBlob(blob, `${domain}-resumen-ejecutivo.html`);
      } else if (format === "thtml") {
        const blob = await downloadTechnicalHtml(domain, current.signal);
        if (!current.signal.aborted) saveBlob(blob, `${domain}-reporte-tecnico.html`);
      } else if (format === "tpdf") {
        const report = await getTechnicalReport(domain, current.signal);
        if (current.signal.aborted) return;
        buildTechnicalPdf(report, LABELS).save(`${domain}-reporte-tecnico.pdf`);
      } else {
        const report = await getExecutiveReport(domain, current.signal);
        if (current.signal.aborted) return;
        buildExecutivePdf(report, LABELS).save(`${domain}-resumen-ejecutivo.pdf`);
      }
    } catch (error) {
      if (!current.signal.aborted) setMessage(getErrorMessage(error, { apiMessageOn403: true }));
    } finally {
      setBusy(null);
    }
  };

  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="relative inline-flex flex-col items-end">
      <span className="inline-flex gap-2" role="group" aria-label="Reporte ejecutivo">
        <ActionButton variant={variant} size={size} loading={busy === "pdf"} disabled={Boolean(disabledReason) || busy !== null}
          title={disabledReason} onClick={() => run("pdf")}>
          {busy !== "pdf" && <FileDown aria-hidden="true" className={icon} />}
          Exportar PDF
        </ActionButton>
        <ActionButton variant={variant} size={size} loading={busy === "html"} disabled={Boolean(disabledReason) || busy !== null}
          title={disabledReason} onClick={() => run("html")} aria-label="Exportar reporte ejecutivo en HTML">
          {busy !== "html" && <FileCode aria-hidden="true" className={icon} />}
          HTML
        </ActionButton>
        {technical && (
          <>
            <ActionButton variant={variant} size={size} loading={busy === "tpdf"} disabled={Boolean(disabledReason) || busy !== null}
              title={disabledReason} onClick={() => run("tpdf")} aria-label="Exportar reporte técnico en PDF">
              {busy !== "tpdf" && <FileDown aria-hidden="true" className={icon} />}
              Técnico PDF
            </ActionButton>
            <ActionButton variant={variant} size={size} loading={busy === "thtml"} disabled={Boolean(disabledReason) || busy !== null}
              title={disabledReason} onClick={() => run("thtml")} aria-label="Exportar reporte técnico en HTML">
              {busy !== "thtml" && <FileCode aria-hidden="true" className={icon} />}
              Técnico HTML
            </ActionButton>
          </>
        )}
      </span>
      <span aria-live="polite" className="absolute top-full z-10 mt-1 w-56 text-right text-[11px] text-lt-muted empty:hidden">
        {message}
      </span>
    </span>
  );
}
