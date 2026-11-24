"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode, FileDown } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { printReportHtml } from "@/lib/imprimirReporte";
import { getErrorMessage } from "@/services/errors";
import { downloadExecutiveHtml } from "@/services/reportService";

interface ReportButtonProps {
  domain: string;
  /** Sin carta vigente no se puede exportar (exportBlockReasons). */
  disabledReason?: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const PDF_HINT = "Abre la impresión del navegador con el reporte: elige Guardar como PDF";

/**
 * Reporte ejecutivo del dominio (#45, RC-70) en PDF y en HTML, con el estado actual de la API. Los dos salen del mismo
 * HTML de GET /domains/{fqdn}/report?formato=html: el botón HTML lo descarga y el de PDF lo imprime (RC-70 punto 4,
 * src/lib/imprimirReporte.ts). Sin autorización firmada vigente la API responde 403 y ese mensaje se muestra tal cual. Úsalo con key={domain}: el estado (mensaje y
 * descarga en curso) es de un dominio, y al cambiar de dominio el botón anterior se desmonta y aborta su petición.
 */
export function ReportButton({ domain, disabledReason, variant = "secondary", size = "md" }: ReportButtonProps) {
  const [busy, setBusy] = useState<"pdf" | "html" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const removeFrame = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    controller.current?.abort();
    removeFrame.current?.();
  }, []);

  const run = async (format: "pdf" | "html") => {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(format);
    setMessage(null);
    try {
      const blob = await downloadExecutiveHtml(domain, current.signal);
      if (current.signal.aborted) return;
      if (format === "html") {
        saveBlob(blob, `${domain}-resumen-ejecutivo.html`);
      } else {
        removeFrame.current?.();
        removeFrame.current = await printReportHtml(await blob.text(), document, current.signal);
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
          title={disabledReason ?? PDF_HINT} onClick={() => run("pdf")}>
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
