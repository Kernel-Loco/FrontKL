"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, Download, FileJson } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { BandBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CHECKBOX } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { CATEGORY_LABELS } from "@/config/labels";
import { getErrorMessage } from "@/services/errors";
import { downloadActionPlan, simulateActionPlan, type PlanExportFormat } from "@/services/planService";
import type { ActionPlan, ActionPlanSimulation } from "@/types";

function saveBlob(blob: Blob, domain: string, format: PlanExportFormat) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${domain}-plan.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ActionPlanExplorer({ plan }: { plan: ActionPlan }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [simulationState, setSimulationState] = useState<{
    selection: string;
    data?: ActionPlanSimulation;
    error?: string;
  } | null>(null);
  const [exporting, setExporting] = useState<PlanExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const selection = selected.join("\u001f");

  useEffect(() => {
    if (!selection) return;

    const controller = new AbortController();
    simulateActionPlan(plan.domain, selection.split("\u001f"), controller.signal)
      .then((data) => setSimulationState({ selection, data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSimulationState({ selection, error: getErrorMessage(error) });
      });
    return () => controller.abort();
  }, [plan.domain, selection]);

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const exportPlan = async (format: PlanExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      saveBlob(await downloadActionPlan(plan.domain, format), plan.domain, format);
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const currentSimulation = simulationState?.selection === selection ? simulationState : null;
  const simulation = currentSimulation?.data;
  const simulationError = currentSimulation?.error;
  const simulating = selected.length > 0 && currentSimulation === null;
  const reduction = simulation?.score_reduction ?? 0;
  const scoreAfter = selected.length === 0 ? plan.score_before : simulation?.score_after;
  const bandAfter = selected.length === 0 ? plan.band_before : simulation?.band_after;

  return (
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <Card
        title="Acciones recomendadas"
        description={`${plan.total} acciones para ${plan.domain}`}
        action={(
          <span className="flex gap-1">
            <ActionButton variant="ghost" size="sm" loading={exporting === "csv"} onClick={() => exportPlan("csv")}>
              <Download aria-hidden="true" className="h-4 w-4" /> CSV
            </ActionButton>
            <ActionButton variant="ghost" size="sm" loading={exporting === "json"} onClick={() => exportPlan("json")}>
              <FileJson aria-hidden="true" className="h-4 w-4" /> JSON
            </ActionButton>
          </span>
        )}
      >
        {plan.partial_coverage && (
          <InlineAlert tone="warning" className="mb-4">
            Cobertura parcial: alguna fuente falló o hay reglas que las fuentes actuales todavía no pueden revisar. El
            impacto se estima con los hallazgos disponibles.
          </InlineAlert>
        )}
        {exportError && <InlineAlert tone="error" className="mb-4">{exportError}</InlineAlert>}
        {plan.actions.length === 0 ? (
          <EmptyState title="Sin acciones pendientes">No hay hallazgos abiertos que generen acciones para este dominio.</EmptyState>
        ) : (
          <ul className="divide-y divide-lt-border">
            {plan.actions.map((action) => {
              const checked = selected.includes(action.id);
              return (
                <li key={action.id} className="flex min-w-0 items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <input
                    id={`action-${action.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(action.id)}
                    className={`${CHECKBOX} mt-1`}
                    aria-label={`Simular: ${action.recommendation}`}
                  />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`action-${action.id}`} className="block cursor-pointer">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-lt-muted">{CATEGORY_LABELS[action.category]}</span>
                      <span className="text-xs text-lt-faint">{action.finding_count} {action.finding_count === 1 ? "hallazgo" : "hallazgos"}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-lt-text">{action.recommendation}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-lt-teal">
                      <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />
                      Score estimado: {action.score_after} ({action.score_reduction > 0 ? `−${action.score_reduction}` : "sin cambio"})
                    </span>
                    </label>
                    <Link
                      href={`/dashboard/hallazgos?dominio=${encodeURIComponent(plan.domain)}&regla=${encodeURIComponent(action.rule_code)}`}
                      aria-label={`Ver ${action.finding_count} ${action.finding_count === 1 ? "hallazgo" : "hallazgos"} de esta acción`}
                      className="mt-2 inline-block text-xs font-medium text-lt-teal underline-offset-2 hover:underline"
                    >
                      Ver hallazgos
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Simulador de score" description="La selección no modifica hallazgos ni el score guardado.">
        {simulationError && <InlineAlert tone="error" className="mb-4">{simulationError}</InlineAlert>}
        <div aria-busy={simulating} className="grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-lg bg-lt-raised p-3">
            <p className="text-xs text-lt-muted">Actual</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-lt-text">{plan.score_before}</p>
            <BandBadge band={plan.band_before} />
          </div>
          <div className="min-w-0 rounded-lg bg-lt-raised p-3">
            <p className="text-xs text-lt-muted">Con selección</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-lt-text">{simulating ? "…" : scoreAfter ?? "—"}</p>
            {bandAfter && <BandBadge band={bandAfter} />}
          </div>
        </div>
        <div aria-live="polite" className="mt-4 border-t border-lt-border pt-4">
          {selected.length === 0 ? (
            <p className="text-sm text-lt-muted">Selecciona una o varias acciones para calcular el impacto conjunto.</p>
          ) : simulating ? (
            <p className="text-sm text-lt-muted">Calculando combinación…</p>
          ) : simulation ? (
            <p className="text-sm font-semibold text-lt-teal">Reducción estimada: {reduction} puntos</p>
          ) : null}
          {simulation?.floor_message_after && <p className="mt-2 text-xs text-lt-amber">{simulation.floor_message_after}</p>}
        </div>
      </Card>
    </div>
  );
}