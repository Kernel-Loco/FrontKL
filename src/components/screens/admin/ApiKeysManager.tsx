"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { CHECKBOX, Field, INPUT, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { API_SCOPE_LABELS } from "@/config/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { API_KEY_MAX_DAYS, API_KEY_OWN_USE_ERROR, createApiKey, revokeApiKey } from "@/services/apiKeyService";
import { getErrorMessage } from "@/services/errors";
import type { ApiKey } from "@/types";

function keyStatus(key: ApiKey): { label: string; tone: "teal" | "red" | "gray" } {
  if (key.revoked_at) return { label: "Revocada", tone: "red" };
  if (Date.parse(key.expires_at) <= Date.now()) return { label: "Vencida", tone: "gray" };
  return { label: "Activa", tone: "teal" };
}

export function ApiKeysManager({ initial, domains }: { initial: ApiKey[]; domains: string[] }) {
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownUseError, setOwnUseError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ id: string; name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    if (data.get("own_use") !== "on") {
      setOwnUseError(API_KEY_OWN_USE_ERROR);
      return;
    }
    setOwnUseError(null);
    const name = String(data.get("name") ?? "").trim();
    const days = Number(data.get("days"));
    if (!name || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) {
      setError("El nombre debe tener entre 1 y 80 caracteres y no llevar caracteres de control.");
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > API_KEY_MAX_DAYS) {
      setError(`La vigencia debe ser un número entero entre 1 y ${API_KEY_MAX_DAYS} días.`);
      return;
    }
    setCreating(true);
    try {
      const { key, ...created } = await createApiKey({
        name,
        domain: String(data.get("domain") ?? "") || null,
        expires_in_days: days,
        own_use: true,
      });
      setKeys((current) => [created, ...current]);
      setSecret({ id: created.id, name: created.name, value: key });
      setCopied(false);
      form.reset();
    } catch (err) {
      setError(getErrorMessage(err, { apiMessageOn403: true }));
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    setError(null);
    setRevokingId(id);
    try {
      await revokeApiKey(id);
      setKeys((current) => current.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString(), status: "revoked" } : k)));
      setSecret((current) => current?.id === id ? null : current);
    } catch (err) {
      setError(getErrorMessage(err, { apiMessageOn403: true }));
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
      setError("No se pudo copiar. Selecciona la llave y cópiala a mano.");
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card title="Crear llave" description={`Para los sistemas de tu propia empresa. Disponible en Business y Enterprise; vigencia máxima de ${API_KEY_MAX_DAYS} días.`} icon={<KeyRound aria-hidden="true" className="h-4 w-4" />}>
        <form onSubmit={onCreate} noValidate className="space-y-4">
          <Field label="Nombre" htmlFor="key-name">
            <input id="key-name" name="name" maxLength={80} placeholder="SIEM corporativo" className={INPUT} autoComplete="off" />
          </Field>
          <Field label="Alcance" htmlFor="key-domain" hint="La llave puede consultar toda la empresa o solo un dominio.">
            <select id="key-domain" name="domain" className={SELECT}>
              <option value="">Toda la empresa</option>
              {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
            </select>
          </Field>
          <p className="text-[13px] text-lt-muted">Permiso: solo lectura. Las llaves no pueden modificar datos ni iniciar escaneos.</p>
          <Field label="Vigencia (días)" htmlFor="key-days">
            <input id="key-days" name="days" type="number" min={1} max={API_KEY_MAX_DAYS} defaultValue={90} className={`${INPUT} w-28`} />
          </Field>
          <div className="rounded-lg border border-lt-border bg-lt-raised/60 p-3.5">
            <label className="flex items-start gap-2.5 text-[13px] text-lt-muted">
              <input
                type="checkbox"
                name="own_use"
                className={`${CHECKBOX} mt-0.5`}
                onChange={(e) => e.target.checked && setOwnUseError(null)}
                {...(ownUseError ? { "aria-invalid": true, "aria-describedby": "own_use-error" } : {})}
              />
              Confirmo que la llave es para un sistema de mi propia empresa. No se da a un integrador ni a otra empresa.
            </label>
            {ownUseError && (
              <p id="own_use-error" className="mt-1.5 text-xs font-medium text-lt-red">
                {ownUseError}
              </p>
            )}
          </div>
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <ActionButton type="submit" loading={creating} className="w-full">
            Crear llave
          </ActionButton>
        </form>
        {secret && (
          <div className="mt-5 space-y-2 rounded-lg border border-lt-amber/30 bg-lt-amber/5 p-3.5">
            <p className="text-xs font-semibold text-lt-amber">Copia la llave «{secret.name}» ahora: no se volverá a mostrar.</p>
            <div className="flex items-center gap-2 rounded-md bg-lt-bg px-3 py-2">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-lt-text">{secret.value}</code>
              <ActionButton variant="secondary" size="sm" onClick={copy}>{copied ? "Copiada" : "Copiar"}</ActionButton>
            </div>
          </div>
        )}
      </Card>

      <Card title="Llaves" padded={false} action={`${keys.filter((k) => keyStatus(k).label === "Activa").length} activas`}>
        <TableWrap>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Llave</th>
                <th scope="col" className={TH}>Alcance</th>
                <th scope="col" className={TH}>Permisos</th>
                <th scope="col" className={TH}>Vence</th>
                <th scope="col" className={TH}>Último uso</th>
                <th scope="col" className={TH}>Estado</th>
                <th scope="col" className={TH}><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const status = keyStatus(k);
                return (
                  <tr key={k.id} className={TR}>
                    <td className={TD}>
                      <span className="block font-medium">{k.name}</span>
                      <code className="font-mono text-[11px] text-lt-faint">{k.key_prefix}…</code>
                    </td>
                    <td className={`${TD} max-w-48 break-all`}>{k.domain ?? "Toda la empresa"}</td>
                    <td className={`${TD} max-w-48`}>
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} tone="gray">{API_SCOPE_LABELS[s] ?? s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDate(k.expires_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{k.last_used_at ? formatDateTime(k.last_used_at) : "Nunca"}</td>
                    <td className={TD}><Badge tone={status.tone} dot>{status.label}</Badge></td>
                    <td className={`${TD} text-right`}>
                      {status.label !== "Revocada" &&
                        (confirmId === k.id ? (
                          <span className="inline-flex gap-1">
                            <ActionButton variant="danger" size="sm" loading={revokingId === k.id} onClick={() => onRevoke(k.id)}>Confirmar</ActionButton>
                            <ActionButton variant="ghost" size="sm" onClick={() => setConfirmId(null)}>No</ActionButton>
                          </span>
                        ) : (
                          <ActionButton variant="ghost" size="sm" onClick={() => setConfirmId(k.id)}>
                            Revocar<span className="sr-only"> {k.name}</span>
                          </ActionButton>
                        ))}
                    </td>
                  </tr>
                );
              })}
              {keys.length === 0 && (
                <tr><td className={`${TD} text-lt-muted`} colSpan={7}>Todavía no hay llaves de API.</td></tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
