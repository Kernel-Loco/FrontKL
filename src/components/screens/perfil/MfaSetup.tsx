"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CodeInput } from "@/components/CodeInput";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field, INPUT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ApiError } from "@/lib/apiClient";
import { groupSecret, isQrDataUri, minutesLeft, setupMustRestart } from "@/lib/mfaSetup";
import { enableMfa, startMfaSetup } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import type { MfaSetupResponse } from "@/types";

type Step = "password" | "scan" | "done";

/**
 * Alta de TOTP (RC-154): 1) contraseña actual, 2) QR y código de 6 dígitos de la app. La API guarda el secreto solo
 * cuando el código es válido; mientras tanto la cuenta sigue sin MFA.
 */
export function MfaSetup() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<Step>("password");
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const current = String(new FormData(event.currentTarget).get("current") ?? "");
    if (!current) return setError("Escribe tu contraseña actual.");
    setBusy(true);
    setError(null);
    try {
      const result = await startMfaSetup({ current_password: current });
      if (!isQrDataUri(result.qr_svg)) throw new Error("La respuesta del servicio no trae el código QR.");
      formRef.current?.reset();
      setSetup(result);
      setCode("");
      setCodeKey((key) => key + 1);
      setStep("scan");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) return setError("Escribe los 6 dígitos que muestra tu app.");
    setBusy(true);
    setError(null);
    try {
      await enableMfa({ code });
      setSetup(null);
      setStep("done");
      router.refresh();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      setCode("");
      setCodeKey((key) => key + 1);
      if (err instanceof ApiError && setupMustRestart(err.status, message)) {
        setSetup(null);
        setStep("password");
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === "done") {
    return <InlineAlert tone="success">Listo: desde ahora LowTide te pide el código de tu app al iniciar sesión.</InlineAlert>;
  }

  if (step === "scan" && setup) {
    return (
      <form method="post" onSubmit={onCode} noValidate className="space-y-4">
        <p className="text-sm text-lt-muted">
          Escanea el código con tu app autenticadora (Google Authenticator, Microsoft Authenticator, 1Password u otra) y
          escribe el código de 6 dígitos que te muestra. Vence en {minutesLeft(setup.expires_in_seconds)} minutos.
        </p>
        {/* El QR lo dibuja la API como data: URI; no pasa por ningún servicio de terceros. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={setup.qr_svg}
          alt="Código QR para agregar LowTide a tu app autenticadora"
          width={216}
          height={216}
          className="mx-auto block h-auto w-full max-w-[216px] rounded-lg bg-white p-2"
        />
        <div>
          <p className="text-xs text-lt-muted">¿No puedes escanearlo? Escribe esta clave en la app:</p>
          <p className="mt-1 break-all font-mono text-sm text-lt-text" data-testid="mfa-secret">
            {groupSecret(setup.secret)}
          </p>
        </div>
        <CodeInput key={codeKey} length={6} onChange={setCode} label="Código de 6 dígitos de tu app" disabled={busy} />
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        <div className="flex flex-wrap gap-2">
          <ActionButton type="submit" loading={busy} disabled={code.length !== 6}>Verificar y activar</ActionButton>
          <ActionButton
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setSetup(null);
              setError(null);
              setStep("password");
            }}
          >
            Cancelar
          </ActionButton>
        </div>
      </form>
    );
  }

  return (
    <form ref={formRef} method="post" onSubmit={onPassword} noValidate className="space-y-4">
      <p className="text-sm text-lt-muted">
        Protege tu cuenta con un código de 6 dígitos de una app autenticadora. Para empezar, confirma tu contraseña.
      </p>
      <Field label="Contraseña actual" htmlFor="mfa-current">
        <input id="mfa-current" name="current" type="password" autoComplete="current-password" className={INPUT} />
      </Field>
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      <ActionButton type="submit" loading={busy}>Mostrar código QR</ActionButton>
    </form>
  );
}
