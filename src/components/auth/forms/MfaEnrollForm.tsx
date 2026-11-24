"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { Spinner } from "@/components/Spinner";
import { useFlowState } from "@/hooks/useFlowState";
import { ApiError } from "@/lib/apiClient";
import { clearFlow } from "@/lib/flowStorage";
import { enrollMustRescan, enrollMustRestart } from "@/lib/mfaEnroll";
import { groupSecret, isQrDataUri, minutesLeft } from "@/lib/mfaSetup";
import { enableMfaEnroll, startMfaEnroll } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import type { MfaSetupResponse } from "@/types";

const MFA_LENGTH = 6;

/**
 * Alta de TOTP al entrar (RC-5): el Admin sin TOTP llega aquí desde el 403 de /auth/login, sin sesión.
 * 1) pide el QR con el token del 403, 2) el primer código válido guarda el secreto y la API crea la sesión.
 * El QR se pide con un botón y no al montar: así React no lo pide dos veces ni gasta el token sin que la persona lo vea.
 */
export function MfaEnrollForm() {
  const router = useRouter();
  const { ready, data } = useFlowState("mfaEnroll");
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El token venció, se usó o la contraseña cambió: solo queda volver a iniciar sesión.
  const [expired, setExpired] = useState(false);

  // Sin el 403 de un login previo no hay nada que activar.
  useEffect(() => {
    if (ready && !data && !navigating) router.replace("/login");
  }, [ready, data, navigating, router]);

  const fail = (err: unknown) => {
    const message = getErrorMessage(err);
    setError(message);
    if (err instanceof ApiError && enrollMustRestart(err.status, message)) {
      setSetup(null);
      setExpired(true);
    } else if (err instanceof ApiError && enrollMustRescan(err.status, message)) {
      setSetup(null);
    }
  };

  const onQr = async () => {
    if (!data || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await startMfaEnroll({ mfa_setup_token: data.mfa_setup_token });
      if (!isQrDataUri(result.qr_svg)) throw new Error("La respuesta del servicio no trae el código QR.");
      setSetup(result);
      setCode("");
      setCodeKey((key) => key + 1);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const onCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || busy) return;
    if (code.length !== MFA_LENGTH) return setError(`Escribe los ${MFA_LENGTH} dígitos que muestra tu app.`);
    setBusy(true);
    setError(null);
    try {
      await enableMfaEnroll({ mfa_setup_token: data.mfa_setup_token, code });
      // Primero navigating: al limpiar el flujo, el efecto de arriba no debe redirigir.
      setNavigating(true);
      clearFlow("mfaEnroll");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      fail(err);
      setCode("");
      setCodeKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    clearFlow("mfaEnroll");
    router.push("/login");
  };

  if (!ready || !data) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Cargando">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const back = (
    <div className="text-sm">
      <button
        type="button"
        onClick={goBack}
        disabled={busy || navigating}
        className="rounded-sm font-medium text-lt-primary hover:underline disabled:opacity-60"
      >
        Volver al inicio
      </button>
    </div>
  );

  if (expired) {
    return (
      <div className="space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Button onClick={goBack}>Iniciar sesión de nuevo</Button>
      </div>
    );
  }

  if (setup) {
    return (
      <form method="post" onSubmit={onCode} noValidate className="space-y-5">
        <p className="text-sm text-slate-600">
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
          <p className="text-xs text-slate-500">¿No puedes escanearlo? Escribe esta clave en la app:</p>
          <p className="mt-1 break-all font-mono text-sm text-lt-ink" data-testid="mfa-secret">
            {groupSecret(setup.secret)}
          </p>
        </div>
        <CodeInput
          key={codeKey}
          length={MFA_LENGTH}
          label="Código de 6 dígitos de tu app"
          onChange={(value) => {
            setCode(value);
            if (error) setError(null);
          }}
          disabled={busy || navigating}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" loading={busy || navigating} disabled={code.length !== MFA_LENGTH}>
          Verificar y entrar
        </Button>
        {back}
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <Notice>{data.detail}</Notice>
      {error && <Notice tone="error">{error}</Notice>}
      <Button onClick={onQr} loading={busy}>
        Mostrar código QR
      </Button>
      {back}
    </div>
  );
}
