"use client";

import { Braces, FileSpreadsheet } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { toCsv } from "@/lib/csv";
import { tx } from "@/i18n/tx";

type ExportRow = Record<string, unknown>;

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function DataExport({ filename, rows }: { filename: string; rows: ExportRow[] }) {
  const disabled = rows.length === 0;

  const exportCsv = () => {
    if (disabled) return;
    downloadFile(`${filename}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  };

  const exportJson = () => {
    if (disabled) return;
    downloadFile(`${filename}.json`, `${JSON.stringify(rows, null, 2)}\n`, "application/json;charset=utf-8");
  };

  return (
    <div className="flex flex-wrap gap-2" aria-label={tx("Exportar datos")}>
      <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={exportCsv} title={tx("Exportar CSV")} aria-label={tx("Exportar CSV")}>
        <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
        CSV
      </ActionButton>
      <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={exportJson} title={tx("Exportar JSON")} aria-label={tx("Exportar JSON")}>
        <Braces aria-hidden="true" className="h-4 w-4" />
        JSON
      </ActionButton>
    </div>
  );
}