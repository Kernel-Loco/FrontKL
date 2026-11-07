"use client";

import { useEffect, useId, useState } from "react";
import { Braces, FileSpreadsheet } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card } from "@/components/ui/Card";
import { SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { CATEGORY_LABELS, SEVERITY_LABELS } from "@/config/labels";
import { formatShortDate } from "@/lib/format";
import { getErrorMessage } from "@/services/errors";
import { compareScores, downloadComparison, type ComparisonExportFormat } from "@/services/historyService";
import type { Category, ComparisonChange, ComparisonItem, ScoreComparison, ScoreHistoryPoint } from "@/types";
import { Delta } from "./Delta";

function reasonSuffix(p: ScoreHistoryPoint) {
  if (p.reason === "scan") return "";
  return p.reason === "correction" ? " · corrección" : " · recálculo";
}

const CHANGE_LABELS: Record<ComparisonChange, string> = {
  new: "Nuevos",
  gone: "Ya no están",
  kept: "Siguen",
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function severityText(item: ComparisonItem) {
  const from = item.severity_from ? SEVERITY_LABELS[item.severity_from] : null;
  const to = item.severity_to ? SEVERITY_LABELS[item.severity_to] : null;
  if (item.severity_changed) return `${from} → ${to}`;
  return to ?? from ?? "";
}

function FindingRow({ item }: { item: ComparisonItem }) {
  return (
    <li className="py-2 text-sm">
      <span className="block font-medium text-lt-text">{item.title}</span>
      <span className="block text-xs text-lt-muted">
        {item.asset} · {CATEGORY_LABELS[item.category]} · {severityText(item)}
      </span>
    </li>
  );
}

function FindingComparison({ domain, fromScoreId, toScoreId }: { domain: string; fromScoreId: string; toScoreId: string }) {
  const key = `${fromScoreId}|${toScoreId}`;
  const [state, setState] = useState<{ key: string; data?: ScoreComparison; error?: string } | null>(null);
  const [exporting, setExporting] = useState<ComparisonExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    compareScores(domain, fromScoreId, toScoreId, controller.signal)
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ key, error: getErrorMessage(error) });
      });
    return () => controller.abort();
  }, [domain, fromScoreId, toScoreId, key]);

  const current = state?.key === key ? state : null;
  const data = current?.data;

  const exportComparison = async (format: ComparisonExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      saveBlob(await downloadComparison(domain, fromScoreId, toScoreId, format), `${domain}-comparacion.${format}`);
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  if (!current) return <p className="mt-4 text-sm text-lt-muted" role="status">Comparando hallazgos…</p>;
  if (current.error) return <InlineAlert tone="error" className="mt-4">{current.error}</InlineAlert>;
  if (!data) return null;

  const groups: { change: ComparisonChange; items: ComparisonItem[] }[] = [
    { change: "new", items: data.items.filter((i) => i.change === "new") },
    { change: "gone", items: data.items.filter((i) => i.change === "gone") },
    { change: "kept", items: data.items.filter((i) => i.change === "kept" && i.severity_changed) },
  ];
  const keptSame = data.summary.kept - data.summary.severity_changed;

  return (
    <section className="mt-5 border-t border-lt-border pt-4" aria-label="Hallazgos entre los dos escaneos">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-lt-text">Hallazgo por hallazgo</h3>
        <span className="flex gap-1" aria-label="Exportar comparación">
          <ActionButton variant="ghost" size="sm" disabled={data.total === 0} loading={exporting === "csv"}
            onClick={() => exportComparison("csv")} title="Exportar CSV" aria-label="Exportar comparación en CSV">
            <FileSpreadsheet aria-hidden="true" className="h-4 w-4" /> CSV
          </ActionButton>
          <ActionButton variant="ghost" size="sm" disabled={data.total === 0} loading={exporting === "json"}
            onClick={() => exportComparison("json")} title="Exportar JSON" aria-label="Exportar comparación en JSON">
            <Braces aria-hidden="true" className="h-4 w-4" /> JSON
          </ActionButton>
        </span>
      </div>
      <p className="mt-1 text-xs text-lt-muted">
        {data.summary.new} {data.summary.new === 1 ? "nuevo" : "nuevos"}, {data.summary.gone} que ya no{" "}
        {data.summary.gone === 1 ? "está" : "están"} y {data.summary.kept} que{" "}
        {data.summary.kept === 1 ? "sigue" : "siguen"}
        {data.summary.severity_changed > 0 && ` (${data.summary.severity_changed} con otra criticidad)`}.
      </p>
      {exportError && <InlineAlert tone="error" className="mt-3">{exportError}</InlineAlert>}
      {groups.map(({ change, items }) => items.length > 0 && (
        <div key={change} className="mt-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-lt-muted">
            {change === "kept" ? "Siguen con otra criticidad" : CHANGE_LABELS[change]} ({items.length})
          </h4>
          <ul className="divide-y divide-lt-border">
            {items.map((item) => <FindingRow key={item.finding_id} item={item} />)}
          </ul>
        </div>
      ))}
      {keptSame > 0 && (
        <p className="mt-3 text-xs text-lt-muted">
          {keptSame} {keptSame === 1 ? "hallazgo sigue" : "hallazgos siguen"} igual.
        </p>
      )}
      {data.summary.gone > 0 && (
        <p className="mt-2 text-xs text-lt-muted">
          Un hallazgo que ya no está pudo resolverse o marcarse como falso positivo. La exportación trae su estado de hoy.
        </p>
      )}
    </section>
  );
}

export function CompareScans({ domain, points }: { domain: string; points: ScoreHistoryPoint[] }) {
  const fromId = useId();
  const toId = useId();
  const [from, setFrom] = useState(Math.max(0, points.length - 2));
  const [to, setTo] = useState(points.length - 1);
  const a = points[from]!;
  const b = points[to]!;
  // Una corrección cambia el número guardado, no la exposición: si hay una
  // entre las dos fechas, la diferencia no se pinta como subida o bajada.
  const withCorrection = points
    .slice(Math.min(from, to) + 1, Math.max(from, to) + 1)
    .some((p) => p.reason === "correction");

  return (
    <Card title="Comparar escaneos">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromId} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Desde
          </label>
          <select id={fromId} value={from} onChange={(e) => setFrom(Number(e.target.value))} className={SELECT}>
            {points.map((p, i) => (
              <option key={p.score_id} value={i}>
                {formatShortDate(p.computed_at)}{reasonSuffix(p)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={toId} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Hasta
          </label>
          <select id={toId} value={to} onChange={(e) => setTo(Number(e.target.value))} className={SELECT}>
            {points.map((p, i) => (
              <option key={p.score_id} value={i}>
                {formatShortDate(p.computed_at)}{reasonSuffix(p)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-lt-border">
        <li className="flex items-center justify-between py-3 text-sm">
          <span className="font-semibold text-lt-text">Riesgo global</span>
          <span className="flex items-center gap-2 tabular-nums text-lt-text">
            {a.score} → {b.score} {!withCorrection && <Delta value={b.score - a.score} />}
          </span>
        </li>
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
          <li key={c} className="flex items-center justify-between py-3 text-sm">
            <span className="text-lt-text">{CATEGORY_LABELS[c]}</span>
            <span className="flex items-center gap-2 tabular-nums text-lt-text">
              {a.categories[c]} → {b.categories[c]}{" "}
              {!withCorrection && <Delta value={b.categories[c] - a.categories[c]} />}
            </span>
          </li>
        ))}
      </ul>
      {withCorrection && (
        <p className="mt-2 text-xs text-lt-muted">
          Entre estas fechas hay una corrección del score guardado, así que la diferencia no es un cambio de exposición.
        </p>
      )}
      <FindingComparison domain={domain} fromScoreId={a.score_id} toScoreId={b.score_id} />
    </Card>
  );
}
