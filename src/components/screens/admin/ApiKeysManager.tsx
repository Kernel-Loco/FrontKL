"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { CHECKBOX, Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { API_SCOPE_LABELS } from "@/config/labels";
import { mensajeDeExito } from "@/config/simulado";
import { formatDate, formatDateTime } from "@/lib/format";
import { API_KEY_MAX_DAYS, API_KEY_OWN_USE_ERROR, API_SCOPES, createApiKey, revokeApiKey } from "@/services/adminService";
import { getErrorMessage } from "@/services/errors";
import type { ApiKey } from "@/types";
import { tx } from "@/i18n/tx";

function keyStatus(key: ApiKey): { label: string; tone: "teal" | "red" | "gray" } {
  if (key.revoked_at) return { label: tx("Revocada"), tone: "red" };
  if (key.expires_at < new Date().toISOString()) return { label: tx("Vencida"), tone: "gray" };
  return { label: tx("Activa"), tone: "teal" };
}

export function ApiKeysManager({ initial }: { initial: ApiKey[] }) {
  const [keys, setKeys] = useState(initial);
  const [scopes, setScopes] = useState<string[]>(["findings:read", "scores:read"]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownUseError, setOwnUseError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSecret(null);
    setError(null);
    if (data.get("own_use") !== "on") {
      setOwnUseError(tx(API_KEY_OWN_USE_ERROR));
      return;
    }
    setOwnUseError(null);
    setCreating(true);
    try {
      const created = await createApiKey({
        name: String(data.get("name") ?? ""),
        scopes,
        expires_in_days: Number(data.get("days")),
        own_use: true,
      });
      setKeys((current) => [created.api_key, ...current]);
      setSecret({ name: created.api_key.name, value: created.secret });
      setCopied(false);
      form.reset();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const revoked = await revokeApiKey(id);
      setKeys((current) => current.map((k) => (k.id === id ? revoked : k)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRevokingId(null);
      setConfirmId(null);
    }
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.value);
      setCopied(true);
    } catch {
      setError(tx("No se pudo copiar. Selecciona la llave y cópiala a mano."));
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card title={tx("Crear llave")} description={tx("Para conectar LowTide con los sistemas de tu propia empresa. Vigencia máxima de {0} días.", API_KEY_MAX_DAYS)} icon={<KeyRound aria-hidden="true" className="h-4 w-4" />}>
        <form onSubmit={onCreate} noValidate className="space-y-4">
          <Field label={tx("Nombre")} htmlFor="key-name">
            <input id="key-name" name="name" placeholder={tx("SIEM corporativo")} className={INPUT} autoComplete="off" />
          </Field>
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-lt-muted">{tx("Permisos")}</legend>
            <div className="space-y-2">
              {API_SCOPES.map((s) => (
                <label key={s} className="flex flex-wrap items-center gap-2.5 text-[13px] text-lt-text">
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={scopes.includes(s)}
                    onChange={(e) => setScopes((c) => (e.target.checked ? [...c, s] : c.filter((x) => x !== s)))}
                  />
                  {API_SCOPE_LABELS[s]} <code className="tabular-nums text-[11px] text-lt-faint">{s}</code>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={tx("Vigencia (días)")} htmlFor="key-days">
            <input id="key-days" name="days" type="number" min={1} max={API_KEY_MAX_DAYS} defaultValue={90} className={`${INPUT} w-28`} />
          </Field>
          <div className="rounded-lg bg-lt-raised/60 p-3.5">
            <label className="flex items-start gap-2.5 text-[13px] text-lt-muted">
              <input
                type="checkbox"
                name="own_use"
                className={`${CHECKBOX} mt-0.5`}
                onChange={(e) => e.target.checked && setOwnUseError(null)}
                {...(ownUseError ? { "aria-invalid": true, "aria-describedby": "own_use-error" } : {})}
              />
              {tx("Confirmo que la llave es para un sistema de mi propia empresa. No se da a un integrador ni a otra empresa.")}</label>
            {ownUseError && (
              <p id="own_use-error" className="mt-1.5 text-xs font-medium text-lt-red">
                {ownUseError}
              </p>
            )}
          </div>
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <ActionButton type="submit" loading={creating} className="w-full">
            {tx("Crear llave")}</ActionButton>
        </form>
        {secret && (
          <div className="mt-5 space-y-2 rounded-lg bg-lt-raised p-3.5">
            <p className="text-xs font-semibold text-lt-text">{mensajeDeExito("createApiKey", tx("Copia la llave «{0}» ahora: no se volverá a mostrar.", secret.name))}</p>
            <div className="flex items-center gap-2 rounded-md bg-lt-bg px-3 py-2">
              <code className="min-w-0 flex-1 break-all tabular-nums text-[11px] text-lt-text">{secret.value}</code>
              <ActionButton variant="secondary" size="sm" onClick={copy}>{copied ? tx("Copiada") : tx("Copiar")}</ActionButton>
            </div>
          </div>
        )}
      </Card>

      <Card title={tx("Llaves")} padded={false} action={tx("{0} activas", keys.filter((k) => keyStatus(k).label === tx("Activa")).length)}>
        <TableWrap>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>{tx("Llave")}</th>
                <th scope="col" className={TH}>{tx("Permisos")}</th>
                <th scope="col" className={TH}>{tx("Vence")}</th>
                <th scope="col" className={TH}>{tx("Último uso")}</th>
                <th scope="col" className={TH}>{tx("Estado")}</th>
                <th scope="col" className={TH}><span className="sr-only">{tx("Acciones")}</span></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const status = keyStatus(k);
                return (
                  <tr key={k.id} className={TR}>
                    <td className={TD}>
                      <span className="block font-medium">{k.name}</span>
                      <code className="tabular-nums text-[11px] text-lt-faint">{k.key_prefix}…</code>
                    </td>
                    <td className={`${TD} max-w-48`}>
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} tone="gray">{API_SCOPE_LABELS[s] ?? s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDate(k.expires_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{k.last_used_at ? formatDateTime(k.last_used_at) : tx("Nunca")}</td>
                    <td className={TD}><Badge tone={status.tone} dot>{status.label}</Badge></td>
                    <td className={`${TD} text-right`}>
                      {status.label === tx("Activa") &&
                        (confirmId === k.id ? (
                          <span className="inline-flex gap-1">
                            <ActionButton variant="danger" size="sm" loading={revokingId === k.id} onClick={() => onRevoke(k.id)}>{tx("Confirmar")}</ActionButton>
                            <ActionButton variant="ghost" size="sm" onClick={() => setConfirmId(null)}>{tx("No")}</ActionButton>
                          </span>
                        ) : (
                          <ActionButton variant="ghost" size="sm" onClick={() => setConfirmId(k.id)}>
                            {tx("Revocar")}<span className="sr-only"> {k.name}</span>
                          </ActionButton>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
