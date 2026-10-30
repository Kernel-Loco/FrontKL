"use client";

import { useId, useMemo, useState } from "react";
import { SeverityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { INPUT, SELECT } from "@/components/ui/Field";
import { TD, TH } from "@/components/ui/Card";
import { DataExport } from "@/components/screens/shared/DataExport";
import {
  ASSET_TYPE_LABELS,
  CATEGORY_LABELS,
  FINDING_STATUS_LABELS,
  RECURRENCE_LABELS,
  SEVERITY_LABELS,
  SOURCE_LABELS,
} from "@/config/labels";
import type { Category, DomainFinding, Severity } from "@/types";
import { ExplanationPanel } from "./ExplanationPanel";

export function FindingsExplorer({
  findings,
  initialRule = "",
  partialCoverage = false,
}: {
  findings: DomainFinding[];
  initialRule?: string;
  partialCoverage?: boolean;
}) {
  const ids = { search: useId(), category: useId(), severity: useId(), rule: useId() };
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [rule, setRule] = useState(initialRule);
  const [selectedId, setSelectedId] = useState(findings[0]?.id ?? null);
  const rules = [...new Set(findings.map((finding) => finding.rule_code))].sort();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter(
      (f) =>
        (!category || f.category === category) &&
        (!severity || f.severity === severity) &&
          (!rule || f.rule_code === rule) &&
        (!q || `${f.title} ${f.asset} ${SOURCE_LABELS[f.source]} ${f.caracteristicas.tipo}`.toLowerCase().includes(q)),
    );
        }, [findings, query, category, severity, rule]);

  const selected = visible.find((f) => f.id === selectedId) ?? visible[0];
  const exportRows = visible.map((finding) => ({
    id: finding.id,
    title: finding.title,
    asset: finding.asset,
    asset_type: ASSET_TYPE_LABELS[finding.asset_type],
    category: CATEGORY_LABELS[finding.category],
    rule_code: finding.rule_code,
    source: SOURCE_LABELS[finding.source],
    severity: SEVERITY_LABELS[finding.severity],
    base_severity: SEVERITY_LABELS[finding.base_severity],
    status: FINDING_STATUS_LABELS[finding.status],
    recurrence: RECURRENCE_LABELS[finding.recurrence],
    cve_id: finding.cve_id,
    cvss: finding.cvss,
    epss: finding.epss,
    in_kev: finding.in_kev,
    evidence: finding.evidence,
    caracteristicas: finding.caracteristicas,
    detected_at: finding.detected_at,
    last_scan_id: finding.last_scan_id,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <label htmlFor={ids.search} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Buscar
          </label>
          <input
            id={ids.search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Subdominio, correo, tecnología…"
            className={`${INPUT} h-11`}
          />
        </div>
        <div>
          <label htmlFor={ids.category} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Categoría
          </label>
          <select id={ids.category} value={category} onChange={(e) => setCategory(e.target.value as Category | "")} className={`${SELECT} h-11`}>
            <option value="">Todas</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.severity} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Criticidad
          </label>
          <select id={ids.severity} value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "")} className={`${SELECT} h-11`}>
            <option value="">Todas</option>
            {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.rule} className="mb-1.5 block text-xs font-medium text-lt-muted">
            Acción del plan
          </label>
          <select id={ids.rule} value={rule} onChange={(e) => setRule(e.target.value)} className={`${SELECT} h-11`}>
            <option value="">Todas</option>
            {rules.map((code) => <option key={code} value={code}>{code.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-lt-muted">{visible.length} de {findings.length} hallazgos</p>
        <DataExport filename="hallazgos" rows={exportRows} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-lt-border bg-lt-surface">
          {visible.length === 0 ? (
            <EmptyState title={findings.length === 0 ? partialCoverage ? "Resultados incompletos" : "Sin hallazgos abiertos" : "Ningún hallazgo coincide"}>
              {findings.length === 0
                ? partialCoverage
                  ? "El último escaneo fue parcial; no se puede concluir que no haya más hallazgos."
                  : "Este dominio no tiene hallazgos abiertos en su último escaneo."
                : "Prueba con otra búsqueda o quita los filtros."}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <caption className="sr-only">Hallazgos. Elige uno para ver por qué tiene su criticidad.</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Hallazgo</th>
                    <th scope="col" className={TH}>Categoría</th>
                    <th scope="col" className={TH}>Fuente</th>
                    <th scope="col" className={TH}>Criticidad</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((f) => {
                    const active = f.id === selected?.id;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedId(f.id)}
                        className={`cursor-pointer border-t border-lt-border transition-colors ${active ? "bg-lt-nav/70" : "hover:bg-lt-raised"}`}
                      >
                        <td className={TD}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(f.id)}
                            aria-pressed={active}
                            className={`text-left ${active ? "font-semibold text-lt-text" : "text-lt-text"} rounded-sm hover:text-lt-indigo`}
                          >
                            {f.title}
                          </button>
                        </td>
                        <td className={`${TD} text-lt-muted`}>{CATEGORY_LABELS[f.category]}</td>
                        <td className={`${TD} whitespace-nowrap font-mono text-xs text-lt-muted`}>{SOURCE_LABELS[f.source]}</td>
                        <td className={TD}>
                          <SeverityBadge severity={f.severity} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {selected && <ExplanationPanel key={selected.id} finding={selected} />}
      </div>
    </div>
  );
}
