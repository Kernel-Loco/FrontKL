"use client";

import { useEffect, useRef, useState } from "react";
import { FileJson } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { getErrorMessage } from "@/services/errors";
import { downloadSiem } from "@/services/exportService";
import { saveBlob } from "./ReportButton";

/**
 * Salida a SIEM del dominio (HX8, HX20): descarga el NDJSON de GET /domains/{fqdn}/export/siem para cargarlo en el HEC
 * de Splunk. La API decide si se puede (plan con SIEM, empresa activa, sin escaneo en curso) y su mensaje se muestra tal
 * cual. Úsalo con key={domain}, como ReportButton: al cambiar de dominio se desmonta y aborta su petición.
 */
export function SiemExportButton({ domain }: { domain: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async () => {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await downloadSiem(domain, current.signal);
      if (!current.signal.aborted) saveBlob(blob, `${domain}-siem.ndjson`);
    } catch (error) {
      if (!current.signal.aborted) setMessage(getErrorMessage(error, { apiMessageOn403: true }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="relative inline-flex flex-col items-end">
      <ActionButton variant="secondary" size="md" loading={busy} disabled={busy} onClick={run}>
        {!busy && <FileJson aria-hidden="true" className="h-4 w-4" />}
        Exportar a SIEM (NDJSON)
      </ActionButton>
      <span aria-live="polite" className="absolute top-full z-10 mt-1 w-56 text-right text-[11px] text-lt-muted empty:hidden">
        {message}
      </span>
    </span>
  );
}
