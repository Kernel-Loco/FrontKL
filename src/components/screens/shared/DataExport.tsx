"use client";

import { Braces, FileSpreadsheet } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

type ExportRow = Record<string, unknown>;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

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
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const content = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))]
      .join("\r\n");
    downloadFile(`${filename}.csv`, `\uFEFF${content}`, "text/csv;charset=utf-8");
  };

  const exportJson = () => {
    if (disabled) return;
    downloadFile(`${filename}.json`, `${JSON.stringify(rows, null, 2)}\n`, "application/json;charset=utf-8");
  };

  return (
    <div className="flex flex-wrap gap-2" aria-label="Exportar datos">
      <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={exportCsv} title="Exportar CSV" aria-label="Exportar CSV">
        <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
        CSV
      </ActionButton>
      <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={exportJson} title="Exportar JSON" aria-label="Exportar JSON">
        <Braces aria-hidden="true" className="h-4 w-4" />
        JSON
      </ActionButton>
    </div>
  );
}