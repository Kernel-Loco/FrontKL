"use client";

import { useEffect, useState } from "react";
import { SeverityBadge } from "@/components/ui/Badge";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Spinner } from "@/components/Spinner";
import { EXPOSICION_LABELS, SENSIBILIDAD_LABELS } from "@/config/labels";
import { marcosDelHallazgo, MARCOS_ATRIBUCION } from "@/lib/marcos";
import { getFindingExplanation } from "@/services/domainService";
import { getErrorMessage } from "@/services/errors";
import { SHAP_LABELS, shapDisplay, shapLegend, shapPhrase, shapTone } from "@/lib/shap";
import type { DomainFinding, FindingExplanation } from "@/types";

interface Factor {
  label: string;
  value: number;
  display: string;
  tone: { text: string; bar: string };
}

// Puntos de una regla: más puntos es más riesgo, así que sí van con los colores de severidad alta y baja.
const POINTS_TONE = { up: { text: "text-lt-orange", bar: "bg-lt-orange" }, down: { text: "text-lt-blue", bar: "bg-lt-blue" } };

function factorsOf(explanation: FindingExplanation): Factor[] {
  if (explanation.method === "ml" && explanation.shap?.length) {
    // SHAP de la clase predicha: signo y color salen de shap.ts, con la misma regla que la frase (RC-71).
    return [...explanation.shap]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .map((s) => ({
        label: SHAP_LABELS[s.feature] ?? s.feature.replace(/_/g, " "),
        value: s.contribution,
        display: shapDisplay(s.contribution),
        tone: shapTone(s.contribution),
      }));
  }
  return explanation.factors.map((f) => ({
    label: f.label,
    value: f.points,
    display: `${f.points > 0 ? "+" : "−"}${Math.abs(f.points)} pts`,
    tone: f.points >= 0 ? POINTS_TONE.up : POINTS_TONE.down,
  }));
}

/** Panel «¿Por qué es crítico?» del hallazgo elegido. */
export function ExplanationPanel({ finding }: { finding: DomainFinding }) {
  const [state, setState] = useState<{ id: string; data?: FindingExplanation; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFindingExplanation(finding.id)
      .then((data) => !cancelled && setState({ id: finding.id, data }))
      .catch((error) => !cancelled && setState({ id: finding.id, error: getErrorMessage(error) }));
    return () => {
      cancelled = true;
    };
  }, [finding.id]);

  const loading = state?.id !== finding.id;
  const explanation = !loading ? state?.data : undefined;
  const factors = explanation ? factorsOf(explanation) : [];
  const topShap = explanation?.method === "ml" && explanation.shap
    ? [...explanation.shap].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 3)
    : [];
  const max = Math.max(1, ...factors.map((f) => Math.abs(f.value)));
  const c = finding.caracteristicas;

  return (
    <aside aria-labelledby="explicacion-titulo" aria-busy={loading} className="rounded-xl border border-lt-border bg-lt-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-lt-muted">¿Por qué es crítico?</p>
      <h2 id="explicacion-titulo" className="mt-1.5 text-lg font-semibold leading-snug text-lt-text">
        {finding.title}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-lt-muted">
        <SeverityBadge severity={finding.severity} />
        {explanation?.confidence != null && <span>confianza del modelo {explanation.confidence.toFixed(2)}</span>}
        {explanation?.method === "rules" && <span>calculado por reglas</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-10" role="status" aria-label="Cargando explicación">
          <Spinner className="h-5 w-5 text-lt-muted" />
        </div>
      ) : state?.error ? (
        <InlineAlert tone="error" className="mt-4">
          {state.error}
        </InlineAlert>
      ) : (
        explanation && (
          <>
            {explanation.rule_title && (
              <p className="mt-4 text-sm text-lt-text">
                Regla: {explanation.rule_title}
                {explanation.meaning && <span className="block text-xs leading-relaxed text-lt-muted">{explanation.meaning}</span>}
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-lt-muted">{explanation.summary}</p>
            {topShap.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm text-lt-text">Lo que más influyó</h3>
                <ol className="mt-3 space-y-2">
                  {topShap.map((factor, index) => (
                    <li key={`${factor.feature}-${index}`} className="text-sm leading-relaxed text-lt-text">
                      {shapPhrase(factor.feature, factor.value, c, factor.contribution, explanation.model_prediction)}
                    </li>
                  ))}
                </ol>
                <details className="mt-4 border-t border-lt-border pt-3">
                  <summary className="cursor-pointer text-xs text-lt-muted hover:text-lt-text">Ver detalle SHAP</summary>
                  <p className="mt-2 text-[11px] text-lt-faint">{shapLegend(explanation.model_prediction)}</p>
                  <ul className="mt-3 space-y-3">
                    {factors.map((f) => (
                      <li key={f.label}>
                        <div className="mb-1 flex justify-between gap-3 text-[13px]">
                          <span className="text-lt-text">{f.label}</span>
                          <span className={`tabular-nums ${f.tone.text}`}>{f.display}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-lt-raised">
                          <div
                            className={`h-full rounded-full ${f.tone.bar}`}
                            style={{ width: `${(Math.abs(f.value) / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : (
              <>
                <h3 className="mt-5 text-sm text-lt-text">Factores que más pesaron</h3>
                <ul className="mt-3 space-y-3">
                  {factors.map((f) => (
                    <li key={f.label}>
                      <div className="mb-1 flex justify-between gap-3 text-[13px]">
                        <span className="text-lt-text">{f.label}</span>
                        <span className={`tabular-nums ${f.tone.text}`}>{f.display}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-lt-raised">
                        <div
                          className={`h-full rounded-full ${f.tone.bar}`}
                          style={{ width: `${(Math.abs(f.value) / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {explanation.method === "rules" && (
              <p className="mt-2 text-[11px] text-lt-faint">
                Suma {explanation.penalty} de {explanation.max_penalty} puntos posibles en su categoría.
              </p>
            )}
            <div className="mt-5 rounded-lg bg-lt-raised p-4">
              <p className="text-sm font-semibold text-lt-text">Recomendación</p>
              <p className="mt-1 text-sm leading-relaxed text-lt-muted">{explanation.recommendation}</p>
            </div>
            {(explanation.model_version || explanation.explanation_model_version) && (
              <p className="mt-3 text-[11px] text-lt-faint">
                {explanation.model_version && <>Modelo del score: {explanation.model_version}. </>}
                {explanation.explanation_model_version && <>Modelo de la confianza y el SHAP: {explanation.explanation_model_version}.</>}
              </p>
            )}
            {marcosDelHallazgo(explanation.frameworks ?? finding.frameworks).length > 0 && (
              <div className="mt-5 border-t border-lt-border pt-4">
                <p className="text-xs font-semibold text-lt-text">Marcos de referencia</p>
                <dl className="mt-2 space-y-1.5 text-xs">
                  {marcosDelHallazgo(explanation.frameworks ?? finding.frameworks).map((m) => (
                    <div key={m.marco} className="flex gap-2">
                      <dt className="shrink-0 text-lt-faint">{m.marco}:</dt>
                      <dd className="min-w-0 break-words text-lt-text">
                        {m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline">{m.texto}</a> : m.texto}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[10px] leading-relaxed text-lt-faint">{MARCOS_ATRIBUCION}</p>
              </div>
            )}
          </>
        )
      )}

      {(finding.cve_id || finding.cvss != null) && (
        <p className="mt-5 text-xs text-lt-text">
          {finding.cve_id && <span className="font-mono">{finding.cve_id}</span>}
          {finding.cve_id && finding.cvss != null && " · "}
          {finding.cvss != null && <span>CVSS {finding.cvss.toFixed(1)}</span>}
        </p>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-lt-border pt-4 text-xs">
        <div>
          <dt className="text-lt-faint">Tipo</dt>
          <dd className="mt-0.5 text-lt-text">{c.tipo.replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-lt-faint">Antigüedad</dt>
          <dd className="mt-0.5 text-lt-text">
            {c.antiguedad_dias} {c.antiguedad_dias === 1 ? "día" : "días"}
          </dd>
        </div>
        <div>
          <dt className="text-lt-faint">Exposición</dt>
          <dd className="mt-0.5 text-lt-text">{EXPOSICION_LABELS[c.exposicion]}</dd>
        </div>
        <div>
          <dt className="text-lt-faint">Sensibilidad</dt>
          <dd className="mt-0.5 text-lt-text">{SENSIBILIDAD_LABELS[c.sensibilidad]}</dd>
        </div>
      </dl>
      {Object.keys(finding.evidence).length > 0 && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-lt-muted hover:text-lt-text">Evidencia</summary>
          <dl className="mt-2 space-y-1.5 rounded-lg bg-lt-bg p-3 font-mono text-[11px]">
            {Object.entries(finding.evidence).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="shrink-0 text-lt-faint">{key}:</dt>
                <dd className="min-w-0 break-words text-lt-text">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-lt-faint">
        Solo observación: se reporta la exposición; nunca se usan las credenciales filtradas ni se accede a los sistemas.
      </p>
    </aside>
  );
}
