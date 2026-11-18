"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { CHECKBOX, Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { API_SCOPE_LABELS } from "@/config/labels";
import { mensajeDeExito } from "@/config/simulado";
import { formatDate, formatDateTime } from "@/lib/format";
import { API_KEY_MAX_DAYS, API_KEY_OWN_USE_ERROR, API_KEY_SCOPE, conRevocadasLocales, contarActivas, estadoVisible, marcarRevocada, puedeRevocar } from "@/lib/llavesApi";
import { createApiKey, revokeApiKey } from "@/services/adminService";
import { getErrorMessage } from "@/services/errors";
import type { ApiKey, ApiKeyCreated, ApiKeyStatus } from "@/types";

const STATUS: Record<ApiKeyStatus, { label: string; tone: "teal" | "red" | "gray" }> = {
  active: { label: "Activa", tone: "teal" },
  expired: { label: "Vencida", tone: "gray" },
  revoked: { label: "Revocada", tone: "red" },
};

/** La fila de la lista, sin la llave completa: `key` solo se guarda en el aviso de copiar. */
function sinLlave(created: ApiKeyCreated): ApiKey {
  const fila: Omit<ApiKeyCreated, "key"> & { key?: string } = { ...created };
  delete fila.key;
  return fila;
}

/** Cada cuánto se vuelve a calcular el estado a la vista, para que una llave que vence con la página abierta lo muestre. */
const RELOJ_MS = 30_000;

export function ApiKeysManager({ initial, domains }: { initial: ApiKey[] | null; domains: string[] | null }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initial ?? []);
  // Las revocadas aquí (id → hora del DELETE), para que una lista pedida antes del DELETE no las vuelva a mostrar activas.
  const [revocadas, setRevocadas] = useState<ReadonlyMap<string, string>>(() => new Map());
  // router.refresh() trae otra lista del servidor: se toma en lugar de la local, que solo se cambió a mano.
  const [base, setBase] = useState(initial);
  if (base !== initial) {
    setBase(initial);
    // null: GET /api-keys falló en ese refresco y la lista de la pantalla se queda como estaba.
    if (initial) setKeys(conRevocadasLocales(initial, revocadas));
  }
  // 0 hasta montar: el primer dibujo usa el estado del servidor y no choca con el HTML que ya llegó.
  const [ahora, setAhora] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({});
  const [ownUseError, setOwnUseError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ id: string; name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ReadonlySet<string>>(() => new Set());
  // El aviso de copiar en el momento del DELETE, no el de cuando empezó: onRevoke espera la respuesta de la API.
  const avisoRef = useRef(secret);
  useEffect(() => {
    avisoRef.current = secret;
  }, [secret]);
  // El refresco de la ruta va en una transición: mientras trae la lista, refrescando sigue en true y no se crea otra
  // llave. Así ningún refresco está en vuelo cuando aparece el aviso de copiar: si su GET /api-keys o /auth/me fallara,
  // admin/error.tsx o el layout quitarían la pantalla y con ella la llave que solo se muestra una vez.
  const [refrescando, startRefresh] = useTransition();
  // Un POST /api-keys en curso. Si se pide un refresco mientras tanto, espera a que el POST responda.
  const creandoRef = useRef(false);
  const refrescoPendienteRef = useRef(false);
  const refrescar = () => {
    if (creandoRef.current) {
      refrescoPendienteRef.current = true;
      return;
    }
    startRefresh(() => router.refresh());
  };

  useEffect(() => {
    const tick = () => setAhora(Date.now());
    const primero = setTimeout(tick, 0);
    const reloj = setInterval(tick, RELOJ_MS);
    return () => {
      clearTimeout(primero);
      clearInterval(reloj);
    };
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creandoRef.current || refrescando) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    // La llave recién creada sigue a la vista hasta que otra la reemplace: un envío que falla no la borra.
    setCreateError(null);
    if (data.get("own_use") !== "on") {
      setOwnUseError(API_KEY_OWN_USE_ERROR);
      return;
    }
    setOwnUseError(null);
    setCreating(true);
    creandoRef.current = true;
    let creada = false;
    try {
      const created = await createApiKey({
        name: String(data.get("name") ?? ""),
        domain: String(data.get("domain") ?? ""),
        expires_in_days: Number(data.get("days")),
        own_use: true,
      });
      setKeys((current) => [sinLlave(created), ...current]);
      setSecret({ id: created.id, name: created.name, value: created.key });
      setCopied(false);
      setCopyError(null);
      form.reset();
      creada = true;
      // Aquí no se refresca la ruta: si GET /api-keys fallara, admin/error.tsx quitaría la pantalla y con ella la
      // llave que solo se muestra una vez. La ruta se refresca al cerrar el aviso (cerrarAviso).
    } catch (err) {
      // 403 sin plan con API y 409 con 20 vigentes traen su mensaje en el detail de la API.
      setCreateError(getErrorMessage(err, { apiMessageOn403: true }));
    } finally {
      creandoRef.current = false;
      setCreating(false);
      // El refresco que esperó al POST: sin aviso nuevo va ya. Con aviso lo hace cerrarAviso.
      if (refrescoPendienteRef.current) {
        refrescoPendienteRef.current = false;
        if (!creada) refrescar();
      }
    }
  };

  const onRevoke = async (id: string) => {
    if (revoking.has(id)) return;
    setRevoking((current) => new Set(current).add(id));
    setRevokeErrors((current) => {
      const otros = { ...current };
      delete otros[id];
      return otros;
    });
    try {
      await revokeApiKey(id);
      const revocadaEn = new Date().toISOString();
      setRevocadas((current) => new Map(current).set(id, revocadaEn));
      setKeys((current) => current.map((k) => (k.id === id ? marcarRevocada(k, revocadaEn) : k)));
      // La llave revocada ya no sirve: si es la del aviso de copiar, el aviso se va con su valor.
      const aviso = avisoRef.current;
      setSecret((current) => (current?.id === id ? null : current));
      // Con el aviso de otra llave a la vista no se refresca: un GET /api-keys fallido lo borraría. Se hace al cerrarlo.
      if (!aviso || aviso.id === id) refrescar();
    } catch (err) {
      setRevokeErrors((current) => ({ ...current, [id]: getErrorMessage(err) }));
    } finally {
      setRevoking((current) => {
        const quedan = new Set(current);
        quedan.delete(id);
        return quedan;
      });
      setConfirmId((current) => (current === id ? null : current));
    }
  };

  const copy = async () => {
    if (!secret) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(secret.value);
      setCopied(true);
    } catch {
      setCopyError("No se pudo copiar. Selecciona la llave y cópiala a mano.");
    }
  };

  // Ya guardada la llave, la ruta se refresca para que Atrás y Adelante no muestren una lista sin ella.
  const cerrarAviso = () => {
    setSecret(null);
    setCopied(false);
    setCopyError(null);
    refrescar();
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <Card title="Crear llave" description={`Para conectar LowTide con los sistemas de tu propia empresa. Vigencia máxima de ${API_KEY_MAX_DAYS} días.`} icon={<KeyRound aria-hidden="true" className="h-4 w-4" />}>
        <form onSubmit={onCreate} noValidate className="space-y-4">
          <Field label="Nombre" htmlFor="key-name">
            {/* Sin maxLength: el atributo cuenta unidades UTF-16 y el backend cuenta caracteres (validarLlave). */}
            <input id="key-name" name="name" placeholder="SIEM corporativo" className={INPUT} autoComplete="off" />
          </Field>
          <Field label="Dominio" htmlFor="key-domain">
            <select
              id="key-domain"
              name="domain"
              defaultValue=""
              className={INPUT}
              {...(domains === null ? { "aria-describedby": "key-domain-error" } : {})}
            >
              <option value="">Todos los dominios de la empresa</option>
              {(domains ?? []).map((fqdn) => (
                <option key={fqdn} value={fqdn}>{fqdn}</option>
              ))}
            </select>
            {domains === null && (
              <p id="key-domain-error" className="mt-1.5 text-xs text-lt-amber">
                No se pudieron cargar los dominios. Para una llave de un solo dominio, recarga la página.
              </p>
            )}
          </Field>
          <p className="text-xs text-lt-muted">
            Permiso: {API_SCOPE_LABELS[API_KEY_SCOPE]}. La llave solo consulta datos, no lanza escaneos ni cambia nada.
          </p>
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
          {createError && <InlineAlert tone="error">{createError}</InlineAlert>}
          <ActionButton type="submit" loading={creating} disabled={refrescando} className="w-full">
            Crear llave
          </ActionButton>
        </form>
        {secret && (
          <div className="mt-5 space-y-2 rounded-lg border border-lt-amber/30 bg-lt-amber/5 p-3.5">
            <p className="text-xs font-semibold text-lt-amber">{mensajeDeExito("createApiKey", `Copia la llave «${secret.name}» ahora: no se volverá a mostrar.`)}</p>
            <div className="flex items-center gap-2 rounded-md bg-lt-bg px-3 py-2">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-lt-text">{secret.value}</code>
              <ActionButton variant="secondary" size="sm" onClick={copy}>{copied ? "Copiada" : "Copiar"}</ActionButton>
            </div>
            {copyError && <InlineAlert tone="error">{copyError}</InlineAlert>}
            <ActionButton variant="ghost" size="sm" onClick={cerrarAviso}>Ya la guardé</ActionButton>
          </div>
        )}
      </Card>

      <Card title="Llaves" padded={false} action={`${contarActivas(keys, ahora)} activas`}>
        {initial === null && (
          <div className="p-4">
            <InlineAlert tone="error">No se pudo cargar la lista de llaves. Recarga la página para verla al día.</InlineAlert>
          </div>
        )}
        <TableWrap>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Llave</th>
                <th scope="col" className={TH}>Alcance</th>
                <th scope="col" className={TH}>Vence</th>
                <th scope="col" className={TH}>Último uso</th>
                <th scope="col" className={TH}>Estado</th>
                <th scope="col" className={TH}><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 && initial !== null && (
                <tr className={TR}>
                  <td colSpan={6} className={`${TD} text-[13px] text-lt-muted`}>Todavía no hay llaves.</td>
                </tr>
              )}
              {keys.map((k) => {
                const estado = estadoVisible(k, ahora);
                const status = STATUS[estado] ?? STATUS.expired;
                const enCurso = revoking.has(k.id);
                // Si la API sí guardó un DELETE que respondió con error, la fila llega revocada y el error ya no aplica.
                const revocable = puedeRevocar(k);
                const revokeError = revocable ? revokeErrors[k.id] : undefined;
                return (
                  <tr key={k.id} className={TR}>
                    <td className={TD}>
                      <span className="block font-medium">{k.name}</span>
                      <code className="font-mono text-[11px] text-lt-faint">{k.key_prefix}…</code>
                      <span className="block text-[11px] text-lt-faint">
                        Creada por {k.created_by} el {formatDate(k.created_at)}
                      </span>
                    </td>
                    <td className={`${TD} max-w-56`}>
                      <span className="block font-mono text-[13px] text-lt-text">{k.domain ?? "Todos los dominios"}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} tone="gray">{API_SCOPE_LABELS[s] ?? s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{formatDate(k.expires_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{k.last_used_at ? formatDateTime(k.last_used_at) : "Nunca"}</td>
                    <td className={TD}><Badge tone={status.tone} dot>{status.label}</Badge></td>
                    <td className={`${TD} text-right`}>
                      {revocable &&
                        (enCurso ? (
                          <ActionButton variant="danger" size="sm" loading>Revocando</ActionButton>
                        ) : confirmId === k.id ? (
                          <span className="inline-flex gap-1">
                            <ActionButton variant="danger" size="sm" onClick={() => onRevoke(k.id)}>Confirmar</ActionButton>
                            <ActionButton variant="ghost" size="sm" onClick={() => setConfirmId(null)}>No</ActionButton>
                          </span>
                        ) : (
                          <ActionButton variant="ghost" size="sm" onClick={() => setConfirmId(k.id)}>
                            Revocar<span className="sr-only"> {k.name}</span>
                          </ActionButton>
                        ))}
                      {revokeError && (
                        <p role="alert" className="mt-1.5 text-left text-xs font-medium text-lt-red">
                          No se revocó: {revokeError}
                        </p>
                      )}
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
