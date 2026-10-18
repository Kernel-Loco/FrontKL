"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { Spinner } from "@/components/Spinner";
import { useFlowState } from "@/hooks/useFlowState";
import { clearFlow } from "@/lib/flowStorage";
import { verifyMfa } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

const MFA_LENGTH = 6;

export function MfaForm() {
  const router = useRouter();
  const { ready, data } = useFlowState("mfa");
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Sin un login previo no hay nada que verificar.
  useEffect(() => {
    if (ready && !data && !navigating) router.replace("/login");
  }, [ready, data, navigating, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || submitting) return;
    if (code.length !== MFA_LENGTH) {
      setError(`Ingresa los ${MFA_LENGTH} dígitos del código.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await verifyMfa({ mfa_token: data.mfa_token, code });
      // Primero navigating: al limpiar el flujo, el efecto de arriba no debe redirigir.
      setNavigating(true);
      clearFlow("mfa");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setCode("");
      setCodeKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    clearFlow("mfa");
    router.push("/login");
  };

  if (!ready || !data) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Cargando">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-600">Código de autenticación</p>
        <CodeInput
          key={codeKey}
          length={MFA_LENGTH}
          label="Código de autenticación de 6 dígitos"
          onChange={(value) => {
            setCode(value);
            if (error) setError(null);
          }}
          disabled={submitting || navigating}
        />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice>{info}</Notice>}
      <Button type="submit" loading={submitting || navigating}>
        Verificar
      </Button>
      <div className="flex items-center justify-between gap-4 text-sm">
        <button
          type="button"
          // TODO: conectar con backend — códigos de recuperación de MFA (POST /auth/mfa/recovery).
          onClick={() => setInfo("Los códigos de recuperación estarán disponibles próximamente. Pide ayuda a un Admin.")}
          className="rounded-sm font-medium text-lt-primary hover:underline"
        >
          Código de recuperación
        </button>
        <button
          type="button"
          onClick={goBack}
          disabled={submitting || navigating}
          className="rounded-sm font-medium text-lt-primary hover:underline disabled:opacity-60"
        >
          Volver al inicio
        </button>
      </div>
    </form>
  );
}
