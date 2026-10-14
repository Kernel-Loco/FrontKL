"use client";

import { useState, type FormEvent } from "react";
import { Webhook } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CHECKBOX, Field, INPUT, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ALERT_EVENT_LABELS, INTEGRATION_KIND_LABELS } from "@/config/labels";
import { createIntegration, setIntegrationEnabled } from "@/services/adminService";
import { getErrorMessage } from "@/services/errors";
import type { AlertEvent, Integration, IntegrationKind } from "@/types";

const EVENTS = Object.keys(ALERT_EVENT_LABELS) as AlertEvent[];

function eventLabel(event: string) {
  return event in ALERT_EVENT_LABELS ? ALERT_EVENT_LABELS[event as AlertEvent].label : event === "report.weekly_summary" ? "Resumen semanal" : event;
}

export function IntegrationsManager({ initial }: { initial: Integration[] }) {
  const [items, setItems] = useState(initial);
  const [kind, setKind] = useState<IntegrationKind>("webhook");
  const [events, setEvents] = useState<string[]>(["finding.created", "score.above_threshold"]);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setResult(null);
    try {
      const created = await createIntegration({ kind, name: String(data.get("name") ?? ""), endpoint: String(data.get("endpoint") ?? "").trim(), events });
      setItems((current) => [...current, created]);
      form.reset();
      setResult({ tone: "success", message: `«${created.name}» quedó activa. Enviaremos un evento de prueba.` });
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: Integration) => {
    setTogglingId(item.id);
    try {
      const updated = await setIntegrationEnabled(item.id, !item.enabled);
      setItems((current) => current.map((i) => (i.id === updated.id ? updated : i)));
    } catch (error) {
      setResult({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card title="Nueva integración" description="Lowtide envía cada evento firmado con HMAC." icon={<Webhook aria-hidden="true" className="h-4 w-4" />}>
        <form onSubmit={onCreate} noValidate className="space-y-4">
          <Field label="Tipo" htmlFor="int-kind">
            <select id="int-kind" value={kind} onChange={(e) => setKind(e.target.value as IntegrationKind)} className={SELECT}>
              {(Object.keys(INTEGRATION_KIND_LABELS) as IntegrationKind[]).map((k) => (
                <option key={k} value={k}>{INTEGRATION_KIND_LABELS[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Nombre" htmlFor="int-name">
            <input id="int-name" name="name" placeholder="Canal de seguridad" className={INPUT} autoComplete="off" />
          </Field>
          <Field label={kind === "email" ? "Correo" : "URL (https)"} htmlFor="int-endpoint">
            <input
              id="int-endpoint"
              name="endpoint"
              type={kind === "email" ? "email" : "url"}
              placeholder={kind === "email" ? "seguridad@organizacion.com" : "https://hooks.organizacion.com/lowtide"}
              className={`${INPUT} font-mono text-[13px]`}
              autoComplete="off"
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-lt-muted">Eventos</legend>
            <div className="space-y-2">
              {EVENTS.map((e) => (
                <label key={e} className="flex items-center gap-2.5 text-[13px] text-lt-text">
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={events.includes(e)}
                    onChange={(ev) => setEvents((c) => (ev.target.checked ? [...c, e] : c.filter((x) => x !== e)))}
                  />
                  {ALERT_EVENT_LABELS[e].label}
                </label>
              ))}
            </div>
          </fieldset>
          {result && <InlineAlert tone={result.tone}>{result.message}</InlineAlert>}
          <ActionButton type="submit" loading={busy} className="w-full">Agregar integración</ActionButton>
        </form>
      </Card>

      <Card title="Integraciones" action={`${items.filter((i) => i.enabled).length} de ${items.length} activas`}>
        <ul className="-my-3 divide-y divide-lt-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-lt-text">
                  {item.name} <Badge tone="indigo">{INTEGRATION_KIND_LABELS[item.kind]}</Badge>
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-lt-muted">{item.endpoint}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.events.map((e) => (
                    <Badge key={e} tone="gray">{eventLabel(e)}</Badge>
                  ))}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={item.enabled}
                aria-label={`${item.enabled ? "Desactivar" : "Activar"} ${item.name}`}
                disabled={togglingId === item.id}
                onClick={() => toggle(item)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${item.enabled ? "bg-lt-indigo" : "bg-lt-raised ring-1 ring-lt-border"}`}
              >
                <span aria-hidden="true" className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${item.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
