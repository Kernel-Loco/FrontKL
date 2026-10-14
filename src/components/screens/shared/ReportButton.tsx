"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { getErrorMessage } from "@/services/errors";
import { requestReport } from "@/services/reportService";
import type { ReportFormat } from "@/types";

interface ReportButtonProps {
  domain: string;
  periodStart: string;
  periodEnd: string;
  format?: ReportFormat;
  label?: string;
  /** Un dominio vencido o por validar no se puede exportar. */
  disabledReason?: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}

/** Pide generar un reporte del dominio y avisa cuando queda en cola. */
export function ReportButton({
  domain,
  periodStart,
  periodEnd,
  format = "pdf",
  label = "Exportar PDF",
  disabledReason,
  variant = "secondary",
  size = "md",
}: ReportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await requestReport({ domain, period_start: periodStart, period_end: periodEnd, format });
      setMessage("Reporte en preparación. Aparecerá en Reportes e histórico.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="relative inline-flex flex-col items-end">
      <ActionButton variant={variant} size={size} loading={busy} disabled={Boolean(disabledReason)} title={disabledReason} onClick={onClick}>
        {!busy && size === "md" && <FileDown aria-hidden="true" className="h-4 w-4" />}
        {label}
      </ActionButton>
      <span aria-live="polite" className="absolute top-full z-10 mt-1 w-56 text-right text-[11px] text-lt-muted empty:hidden">
        {message}
      </span>
    </span>
  );
}
