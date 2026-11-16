"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode, FileDown } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { BAND_LABELS, CATEGORY_LABELS, SEVERITY_LABELS, SOURCE_LABELS } from "@/config/labels";
import { formatDate } from "@/lib/format";
import { buildExecutivePdf } from "@/lib/reporteEjecutivo";
import { scoreCell } from "@/lib/riesgo";
import { getErrorMessage } from "@/services/errors";
import { downloadExecutiveHtml, getExecutiveReport } from "@/services/reportService";

interface ReportButtonProps {
  domain: string;
  /** Un dominio vencido o por validar no se puede exportar. */
  disabledReason?: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Reporte ejecutivo del dominio (#45, RC-70) en PDF y en HTML, con el estado actual de la API. Sin autorización
 * firmada vigente la API responde 403 y ese mensaje se muestra tal cual.
 */
export function ReportButton({ domain, disabledReason, variant = "secondary", size = "md" }: ReportButtonProps) {
  const [busy, setBusy] = useState<"pdf" | "html" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async (format: "pdf" | "html") => {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(format);
    setMessage(null);
    try {
      if (format === "html") {
        const blob = await downloadExecutiveHtml(domain, current.signal);
        if (!current.signal.aborted) saveBlob(blob, `${domain}-resumen-ejecutivo.html`);
      } else {
        const report = await getExecutiveReport(domain, current.signal);
        if (current.signal.aborted) return;
        buildExecutivePdf(report, {
          severity: SEVERITY_LABELS,
          category: CATEGORY_LABELS,
          band: BAND_LABELS,
          source: SOURCE_LABELS,
          formatDate,
          scoreCell,
        }).save(`${domain}-resumen-ejecutivo.pdf`);
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
      </span>
      <span aria-live="polite" className="absolute top-full z-10 mt-1 w-56 text-right text-[11px] text-lt-muted empty:hidden">
        {message}
      </span>
    </span>
  );
}
