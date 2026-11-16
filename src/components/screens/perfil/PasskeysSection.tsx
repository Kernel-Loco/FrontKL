"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { CodeInput } from "@/components/CodeInput";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import { ceremonyErrorMessage, cleanPasskeyName, isCeremonyAborted, registrationMustRestart } from "@/lib/passkeys";
import { deletePasskey, listPasskeys, passkeyRegisterOptions, passkeyRegisterVerify } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import type { PasskeyList } from "@/types";

const noSubscribe = () => () => {};

function message(error: unknown) {
  return ceremonyErrorMessage(error) ?? getErrorMessage(error);
}

/**
 * Passkeys de la cuenta (RC-331): lista, alta y baja. El alta pide la contraseña actual y, si la cuenta tiene TOTP, un
 * código de la app: sin eso, quien tenga la cookie de sesión registraría su passkey y se saltaría el segundo factor.
 */
export function PasskeysSection({ mfaEnabled }: { mfaEnabled: boolean }) {
  const supported = useSyncExternalStore(noSubscribe, browserSupportsWebAuthn, () => true);
  const [data, setData] = useState<PasskeyList | null>(null);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await listPasskeys());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    let active = true;
    listPasskeys().then(
      (result) => active && setData(result),
      (err) => active && setError(getErrorMessage(err)),
    );
    return () => {
      active = false;
    };
  }, []);

  const onAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = String(form.get("current") ?? "");
    const name = cleanPasskeyName(String(form.get("name") ?? ""));
    if (!name) return setError("Ponle un nombre a la passkey, por ejemplo 'Laptop del trabajo'.");
    if (!current) return setError("Escribe tu contraseña actual.");
    if (mfaEnabled && code.length !== 6) return setError("Escribe los 6 dígitos que muestra tu app.");
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { options } = await passkeyRegisterOptions({ current_password: current, ...(mfaEnabled && { code }) });
      const credential = await startRegistration({ optionsJSON: options });
      await passkeyRegisterVerify({ credential, name });
      setAdding(false);
      setNotice(`Listo: ya puedes entrar con la passkey '${name}'.`);
      await load();
    } catch (err) {
      if (!isCeremonyAborted(err)) setError(message(err));
      // Cada intento vuelve a pedir contraseña y código: el código ya se gastó y el reto vence o se gasta en el paso 2.
      if (err instanceof ApiError && registrationMustRestart(err.status, err.message)) {
        setError("La solicitud venció o ya se usó. Escribe otra vez tu contraseña y un código nuevo.");
      }
      setCode("");
      setCodeKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deletePasskey(id);
      setConfirming(null);
      setNotice("Se borró la passkey. Ya no sirve para entrar.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return <InlineAlert tone="info">Este navegador no admite passkeys. Usa uno reciente (Chrome, Edge, Safari o Firefox).</InlineAlert>;
  }
  if (!data) return error ? <InlineAlert tone="error">{error}</InlineAlert> : <p className="text-sm text-lt-muted">Cargando…</p>;

  const full = data.passkeys.length >= data.max;

  return (
    <div className="space-y-4">
      <p className="text-sm text-lt-muted">
        Una passkey te deja entrar con la huella, el rostro o el PIN de tu dispositivo, sin contraseña. Cuenta como
        verificación en dos pasos.
      </p>
      {data.passkeys.length > 0 ? (
        <ul className="divide-y divide-lt-border rounded-lg border border-lt-border">
          {data.passkeys.map((passkey) => (
            <li key={passkey.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-lt-text">
                  {passkey.name} {passkey.backed_up && <Badge tone="teal">Sincronizada</Badge>}
                </p>
                <p className="text-xs text-lt-muted">
                  Creada {formatDateTime(passkey.created_at)} ·{" "}
                  {passkey.last_used_at ? `último uso ${formatDateTime(passkey.last_used_at)}` : "sin usar"}
                </p>
              </div>
              {confirming === passkey.id ? (
                <div className="flex gap-2">
                  <ActionButton size="sm" variant="danger" loading={busy} onClick={() => onDelete(passkey.id)}>
                    Borrar
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                    Cancelar
                  </ActionButton>
                </div>
              ) : (
                <ActionButton size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(passkey.id)}>
                  Borrar…
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-lt-muted">Todavía no tienes passkeys.</p>
      )}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}
      {!data.available ? (
        <InlineAlert tone="info">Las passkeys no están disponibles en este servidor.</InlineAlert>
      ) : full ? (
        <InlineAlert tone="info">Ya tienes {data.max} passkeys. Borra una para registrar otra.</InlineAlert>
      ) : adding ? (
        <form method="post" onSubmit={onAdd} noValidate className="space-y-4">
          <Field label="Nombre de la passkey" htmlFor="passkey-name">
            <input id="passkey-name" name="name" maxLength={60} placeholder="Laptop del trabajo" className={INPUT} />
          </Field>
          <Field label="Contraseña actual" htmlFor="passkey-current">
            <input id="passkey-current" name="current" type="password" autoComplete="current-password" className={INPUT} />
          </Field>
          {mfaEnabled && (
            <CodeInput key={codeKey} length={6} onChange={setCode} label="Código de 6 dígitos de tu app" disabled={busy} autoFocus={false} />
          )}
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <div className="flex flex-wrap gap-2">
            <ActionButton type="submit" loading={busy}>Crear passkey</ActionButton>
            <ActionButton
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancelar
            </ActionButton>
          </div>
        </form>
      ) : (
        <>
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <ActionButton
            variant="secondary"
            onClick={() => {
              setAdding(true);
              setError(null);
              setNotice(null);
            }}
          >
            Agregar passkey
          </ActionButton>
        </>
      )}
    </div>
  );
}
