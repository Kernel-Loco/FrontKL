"use client";

import { useEffect, useRef, useState } from "react";
import { Braces, FileSpreadsheet } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { getErrorMessage } from "@/services/errors";
import type { ExportFormat } from "@/services/exportService";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Botones CSV y JSON que descargan una exportación de la API (#24). La API arma el archivo y responde 403
 * sin autorización vigente: ese mensaje se muestra tal cual. Mientras baja un archivo los dos botones quedan
 * deshabilitados, y al desmontarse (otra pareja o dominio) se cancela la descarga en curso.
 */
export function ApiExport({
  filename,
  download,
  disabled = false,
  label,
  variant = "secondary",
}: {
  /** Sin extensión: se le agrega .csv o .json. */
  filename: string;
  download: (format: ExportFormat, signal: AbortSignal) => Promise<Blob>;
  disabled?: boolean;
  /** Nombre accesible del grupo, p. ej. "Exportar hallazgos". */
  label: string;
  variant?: "secondary" | "ghost";
}) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async (format: ExportFormat) => {
    if (exporting) return;
    const current = new AbortController();
    controller.current = current;
    setExporting(format);
    setError(null);
    try {
      const blob = await download(format, current.signal);
      if (!current.signal.aborted) saveBlob(blob, `${filename}.${format}`);
    } catch (err) {
      if (current.signal.aborted) return;
      setError(getErrorMessage(err, { apiMessageOn403: true }));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {(["csv", "json"] as const).map((format) => (
          <ActionButton key={format} variant={variant} size="sm" disabled={disabled || exporting !== null}
            loading={exporting === format} onClick={() => run(format)} title={`Exportar ${format.toUpperCase()}`}
            aria-label={`${label} en ${format.toUpperCase()}`}>
            {format === "csv"
              ? <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
              : <Braces aria-hidden="true" className="h-4 w-4" />}
            {format.toUpperCase()}
          </ActionButton>
        ))}
      </div>
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
    </div>
  );
}
