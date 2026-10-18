"use client";

import { useId, useMemo, useState } from "react";
import { SeverityBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { INPUT, SELECT } from "@/components/ui/Field";
import { TD, TH } from "@/components/ui/Card";
import { CATEGORY_LABELS, SEVERITY_LABELS, SOURCE_LABELS } from "@/config/labels";
import type { Category, DomainFinding, Severity } from "@/types";
import { ExplanationPanel } from "./ExplanationPanel";

export function FindingsExplorer({ findings }: { findings: DomainFinding[] }) {
  const ids = { search: useId(), category: useId(), severity: useId() };
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [selectedId, setSelectedId] = useState(findings[0]?.id ?? null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter(
      (f) =>
        (!category || f.category === category) &&
        (!severity || f.severity === severity) &&
        (!q || `${f.title} ${f.asset} ${SOURCE_LABELS[f.source]} ${f.caracteristicas.tipo}`.toLowerCase().includes(q)),
    );
  }, [findings, query, category, severity]);

  const selected = visible.find((f) => f.id === selectedId) ?? visible[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
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
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-lt-border bg-lt-surface">
          {visible.length === 0 ? (
            <EmptyState title={findings.length === 0 ? "Sin hallazgos abiertos" : "Ningún hallazgo coincide"}>
              {findings.length === 0 ? "Este dominio no tiene hallazgos abiertos en su último escaneo." : "Prueba con otra búsqueda o quita los filtros."}
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
