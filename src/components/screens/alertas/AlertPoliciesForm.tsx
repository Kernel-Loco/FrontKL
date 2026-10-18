"use client";

import { useId, useState, type FormEvent } from "react";
import { Bell, Gauge } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { BandBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CHECKBOX, INPUT, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ALERT_EVENT_LABELS, SEVERITY_LABELS } from "@/config/labels";
import { scoreBand } from "@/lib/format";
import { getErrorMessage } from "@/services/errors";
import { updateAlertPolicies } from "@/services/settingsService";
import type { AlertPolicies, Severity } from "@/types";

export function AlertPoliciesForm({ initial }: { initial: AlertPolicies }) {
  const thresholdId = useId();
  const [policies, setPolicies] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const threshold = policies.alert_score_threshold;
  const validThreshold = Number.isInteger(threshold) && threshold >= 0 && threshold <= 100;

  const update = (index: number, change: Partial<AlertPolicies["policies"][number]>) =>
    setPolicies((current) => ({ ...current, policies: current.policies.map((p, i) => (i === index ? { ...p, ...change } : p)) }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      setPolicies(await updateAlertPolicies(policies));
      setResult({ tone: "success", message: "Políticas guardadas." });
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card title="Umbral de riesgo" description="La alerta se crea cuando el score de un dominio llega a este valor o lo pasa." icon={<Gauge aria-hidden="true" className="h-4 w-4" />}>
        <label htmlFor={thresholdId} className="mb-1.5 block text-xs font-medium text-lt-muted">
          Umbral (0 a 100)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            value={validThreshold ? threshold : 60}
            onChange={(e) => setPolicies((c) => ({ ...c, alert_score_threshold: Number(e.target.value) }))}
            aria-label="Umbral de riesgo"
            className="flex-1 accent-lt-indigo"
          />
          <input
            id={thresholdId}
            type="number"
            min={0}
            max={100}
            value={Number.isNaN(threshold) ? "" : threshold}
            onChange={(e) => setPolicies((c) => ({ ...c, alert_score_threshold: e.target.valueAsNumber }))}
            className={`${INPUT} w-20 text-center tabular-nums`}
          />
        </div>
        {validThreshold ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-lt-muted">
            Un score de {threshold} está en la banda <BandBadge band={scoreBand(threshold)} />
          </p>
        ) : (
          <p className="mt-3 text-xs font-medium text-lt-red">Escribe un número entero de 0 a 100.</p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-lt-faint">
          Con el valor por defecto (60), la alerta coincide con el inicio de la banda alta. Las alertas se envían por las integraciones de
          Webhooks.
        </p>
      </Card>

      <Card title="Eventos que avisan" icon={<Bell aria-hidden="true" className="h-4 w-4" />}>
        <ul className="-my-3 divide-y divide-lt-border">
          {policies.policies.map((policy, index) => {
            const info = ALERT_EVENT_LABELS[policy.event];
            const id = `policy-${policy.event}`;
            return (
              <li key={policy.event} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                <label htmlFor={id} className="flex min-w-0 flex-1 items-start gap-3">
                  <input id={id} type="checkbox" checked={policy.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} className={`${CHECKBOX} mt-0.5`} />
                  <span>
                    <span className="block text-sm text-lt-text">{info.label}</span>
                    <span className="mt-0.5 block text-xs text-lt-muted">{info.description}</span>
                  </span>
                </label>
                {policy.min_severity !== null && (
                  <select
                    aria-label={`Severidad mínima para «${info.label}»`}
                    value={policy.min_severity}
                    disabled={!policy.enabled}
                    onChange={(e) => update(index, { min_severity: e.target.value as Severity })}
                    className={`${SELECT} h-8 w-40 text-xs`}
                  >
                    {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                      <option key={s} value={s}>
                        Desde {SEVERITY_LABELS[s].toLowerCase()}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-lt-border pt-4">
          {result && <InlineAlert tone={result.tone} className="mr-auto">{result.message}</InlineAlert>}
          <ActionButton type="submit" loading={busy} disabled={!validThreshold}>
            Guardar políticas
          </ActionButton>
        </div>
      </Card>
    </form>
  );
}
