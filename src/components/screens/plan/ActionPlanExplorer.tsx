"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, Download, FileJson } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge, BandBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CHECKBOX } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ASSET_TYPE_LABELS, CATEGORY_LABELS } from "@/config/labels";
import { cantidad } from "@/lib/format";
import { reduccion, urlPlan, type Agrupar } from "@/lib/planAcumulado";
import { getErrorMessage } from "@/services/errors";
import { downloadActionPlan, simulateActionPlan, type PlanExportFormat } from "@/services/planService";
import type { ActionPlan, ActionPlanSimulation, Category, PlanAction, PlanAssetAction } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const AGRUPACIONES: { value: Agrupar; label: string }[] = [
  { value: "regla", label: "Por regla" },
  { value: "activo", label: "Por activo" },
];

function saveBlob(blob: Blob, domain: string, format: PlanExportFormat, agrupar: Agrupar) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${domain}-plan${agrupar === "activo" ? "-por-activo" : ""}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ActionPlanExplorer({
  plan,
  canSeeFindings,
  canGroupByAsset,
  canExport,
}: {
  plan: ActionPlan;
  canSeeFindings: boolean;
  canGroupByAsset: boolean;
  canExport: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [simulationState, setSimulationState] = useState<{
    selection: string;
    data?: ActionPlanSimulation;
    error?: string;
  } | null>(null);
  const [exporting, setExporting] = useState<PlanExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const selection = selected.join("\u001f");
  // El simulador combina acciones por regla (POST /simulate recibe códigos de regla). Por activo no se selecciona.
  const agrupar: Agrupar = plan.grouping === "activo" ? "activo" : "regla";
  const porActivo = agrupar === "activo";

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
    if (!canExport || exporting) return;
    setExporting(format);
    setExportError(null);
    try {
      saveBlob(await downloadActionPlan(plan.domain, format, agrupar), plan.domain, format, agrupar);
    } catch (error) {
      setExportError(getErrorMessage(error, { apiMessageOn403: true }));
    } finally {
      setExporting(null);
    }
  };

  const currentSimulation = simulationState?.selection === selection ? simulationState : null;
  const simulation = currentSimulation?.data;
  const simulationError = currentSimulation?.error;
  const simulating = selected.length > 0 && currentSimulation === null;
  const scoreBefore = simulation?.score_before ?? plan.score_before;
  const bandBefore = simulation?.band_before ?? plan.band_before;
  const scoreAfter = selected.length === 0 ? scoreBefore : simulation?.score_after;
  const bandAfter = selected.length === 0 ? bandBefore : simulation?.band_after;

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <Card
        title="Acciones recomendadas"
        description={`${cantidad(plan.total, "acción", "acciones")} para ${plan.domain}, ${porActivo ? "una por activo" : "una por regla"}`}
        action={(
          <span className="flex gap-1">
            <ActionButton variant="ghost" size="sm" disabled={!canExport || (exporting !== null && exporting !== "csv")} loading={exporting === "csv"} onClick={() => exportPlan("csv")}>
              <Download aria-hidden="true" className="h-4 w-4" /> CSV
            </ActionButton>
            <ActionButton variant="ghost" size="sm" disabled={!canExport || (exporting !== null && exporting !== "json")} loading={exporting === "json"} onClick={() => exportPlan("json")}>
              <FileJson aria-hidden="true" className="h-4 w-4" /> JSON
            </ActionButton>
          </span>
        )}
      >
        {canGroupByAsset && (
        <nav aria-label="Agrupar el plan" className="mb-4 inline-flex rounded-lg border border-lt-border p-0.5">
          {AGRUPACIONES.map((opcion) => (
            <Link
              key={opcion.value}
              href={urlPlan(plan.domain, opcion.value)}
              aria-current={agrupar === opcion.value ? "page" : undefined}
              className={`rounded-md px-3 py-1 text-xs font-medium ${agrupar === opcion.value ? "bg-lt-raised text-lt-text" : "text-lt-muted hover:text-lt-text"}`}
            >
              {opcion.label}
            </Link>
          ))}
        </nav>
        )}
        {plan.actions.length > 1 && (
          <p className="mb-4 text-xs leading-relaxed text-lt-muted">
            {porActivo
              ? "En orden de lo que recupera cada una después de las de arriba (acumulado)."
              : "En orden de lo que recupera cada una sola. El acumulado dice lo que recupera después de las de arriba."}{" "}
            Lo que recupera cada una sola no se suma: los topes por categoría y el piso de un hallazgo crítico cambian lo
            que recupera cada una según las que ya se resolvieron.
          </p>
        )}
        {!canExport && (
          <InlineAlert tone="warning" className="mb-4">
            Para exportar el plan, el dominio debe tener una autorización firmada vigente.
          </InlineAlert>
        )}
        {plan.partial_coverage && (
          <InlineAlert tone="warning" className="mb-4">
            Cobertura parcial: alguna fuente falló, revisó solo una parte de sus repos o IP, o hay reglas que las fuentes
            actuales todavía no pueden revisar. El impacto se estima con los hallazgos disponibles.
          </InlineAlert>
        )}
        {exportError && <InlineAlert tone="error" className="mb-4">{exportError}</InlineAlert>}
        {plan.actions.length === 0 ? (
          <EmptyState title="Sin acciones pendientes">No hay hallazgos abiertos que generen acciones para este dominio.</EmptyState>
        ) : (
          <ol className="divide-y divide-lt-border">
            {porActivo
              ? (plan.actions as PlanAssetAction[]).map((action) => (
                <li key={action.id} className="min-w-0 py-4 first:pt-0 last:pb-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="indigo">{ASSET_TYPE_LABELS[action.asset_type] ?? action.asset_type}</Badge>
                    <span className="break-all font-mono text-[13px] text-lt-text">{action.asset_value}</span>
                    <span className="text-xs text-lt-faint">{cantidad(action.finding_count, "hallazgo")}</span>
                  </span>
                  <ul className="mt-2 space-y-1.5">
                    {action.recommendations.map((r) => (
                      <li key={r.rule_code} className="text-sm leading-relaxed text-lt-text">
                        <span className="text-xs font-semibold text-lt-muted">{CATEGORY_LABELS[r.category]} · </span>
                        {r.recommendation}
                      </li>
                    ))}
                  </ul>
                  <Impacto action={action} />
                </li>
              ))
              : (plan.actions as PlanAction[]).map((action) => {
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
                          <span className="text-xs text-lt-faint">{cantidad(action.finding_count, "hallazgo")}</span>
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-lt-text">{action.recommendation}</span>
                        <Impacto action={action} />
                      </label>
                      {canSeeFindings && (
                        <Link
                          href={`/dashboard/hallazgos?dominio=${encodeURIComponent(plan.domain)}&regla=${encodeURIComponent(action.rule_code)}`}
                          aria-label={`Ver ${cantidad(action.finding_count, "hallazgo")} de esta acción`}
                          className="mt-2 inline-block text-xs font-medium text-lt-teal underline-offset-2 hover:underline"
                        >
                          Ver hallazgos
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
          </ol>
        )}
      </Card>

      <Card
        title="¿Qué pasa si lo arreglo?"
        description="La selección no modifica hallazgos ni el score guardado."
        action={(
          <ActionButton variant="ghost" size="sm" disabled={selected.length === 0} onClick={() => setSelected([])}>
            Limpiar selección
          </ActionButton>
        )}
      >
        {porActivo && (
          <InlineAlert className="mb-4">
            El simulador combina acciones por regla.{" "}
            <Link href={urlPlan(plan.domain, "regla")} className="font-medium text-lt-teal underline-offset-2 hover:underline">
              Ver el plan por regla
            </Link>{" "}
            para elegir qué arreglar.
          </InlineAlert>
        )}
        {simulationError && <InlineAlert tone="error" className="mb-4">{simulationError}</InlineAlert>}
        <div aria-busy={simulating} className="grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-lg bg-lt-raised p-3">
            <p className="text-xs text-lt-muted">Actual</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-lt-text">{scoreBefore}</p>
            <BandBadge band={bandBefore} />
          </div>
          <div className="min-w-0 rounded-lg bg-lt-raised p-3">
            <p className="text-xs text-lt-muted">Con selección</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-lt-text">{simulating ? "…" : scoreAfter ?? "—"}</p>
            {bandAfter && <BandBadge band={bandAfter} />}
          </div>
        </div>
        <div aria-live="polite" className="mt-4 border-t border-lt-border pt-4">
          {selected.length === 0 ? (
            <p className="text-sm text-lt-muted">
              {porActivo
                ? "En la vista por regla puedes seleccionar acciones para calcular el impacto conjunto."
                : "Selecciona una o varias acciones para calcular el impacto conjunto."}
            </p>
          ) : simulating ? (
            <p role="status" className="text-sm text-lt-muted">Calculando combinación de {selected.length} {selected.length === 1 ? "acción" : "acciones"}…</p>
          ) : simulation ? (
            <p className="text-sm font-semibold text-lt-teal">
              {simulation.score_reduction > 0
                ? `Reducción estimada: ${simulation.score_reduction} puntos`
                : simulation.score_reduction < 0
                  ? `Aumento estimado: ${Math.abs(simulation.score_reduction)} puntos`
                  : "La selección no cambia el score"}
            </p>
          ) : null}
          {simulation?.floor_message_after && <p className="mt-2 text-xs text-lt-amber">{simulation.floor_message_after}</p>}
        </div>
        <div className="mt-4 border-t border-lt-border pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-lt-text">Impacto por categoría</h3>
            <div className="flex shrink-0 items-center gap-3 text-[11px] text-lt-muted" aria-hidden="true">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lt-faint" />Actual</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lt-teal" />Estimado</span>
            </div>
          </div>
          <ul className="space-y-4" aria-busy={simulating}>
            {CATEGORIES.map((category) => {
              const before = simulation?.category_scores_before[category] ?? plan.category_scores_before[category];
              const after = simulation?.category_scores_after[category] ?? (selected.length === 0 ? before : null);
              const change = after === null ? null : before - after;

              return (
                <li key={category}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-lt-text">{CATEGORY_LABELS[category]}</span>
                    <span className="shrink-0 tabular-nums text-lt-muted">
                      {before} → {simulating ? "…" : after ?? "—"}
                      {change !== null && change !== 0 && ` · ${change > 0 ? "−" : "+"}${Math.abs(change)}`}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <ProgressBar value={before} tone="gray" label={`${CATEGORY_LABELS[category]} actual: ${before} de 100`} />
                    {after !== null && (
                      <ProgressBar value={after} tone="teal" label={`${CATEGORY_LABELS[category]} estimado: ${after} de 100`} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </div>
  );
}

/** Lo que recupera la acción después de las de arriba (acumulado) y sola (RC-263). */
function Impacto({ action }: { action: PlanAction | PlanAssetAction }) {
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="inline-flex items-center gap-1 text-lt-teal">
        <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />
        Acumulado: {action.score_after_acumulado} ({reduccion(action.score_reduction_acumulado)})
      </span>
      <span className="text-lt-muted">
        Sola: {action.score_after} ({reduccion(action.score_reduction)})
      </span>
    </span>
  );
}
