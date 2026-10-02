"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { IconCard } from "@/components/auth/IconCard";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { Spinner } from "@/components/Spinner";
import { useFlowState } from "@/hooks/useFlowState";
import { clearFlow, writeFlow } from "@/lib/flowStorage";
import { requestPasswordReset, verifyResetCode } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

const CODE_LENGTH = 4;
const RESEND_COOLDOWN_S = 30;

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

export function VerifyResetCodeForm() {
  const router = useRouter();
  const { ready, data } = useFlowState("reset");
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [resending, setResending] = useState(false);
  // El código se acaba de enviar en el paso anterior: el reenvío empieza bloqueado.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (ready && !data) router.replace("/forgot-password");
  }, [ready, data, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || submitting) return;
    if (code.length !== CODE_LENGTH) {
      setError(`Ingresa los ${CODE_LENGTH} dígitos del código.`);
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { reset_token } = await verifyResetCode({ email: data.email, code });
      writeFlow("reset", { email: data.email, reset_token });
      setNavigating(true);
      router.push("/forgot-password/reset");
    } catch (err) {
      setError(getErrorMessage(err));
      setCode("");
      setCodeKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!data || cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await requestPasswordReset({ email: data.email });
      setInfo("Te enviamos un nuevo código.");
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const goBack = () => {
    clearFlow("reset");
    router.push("/forgot-password");
  };

  if (!ready || !data) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Cargando">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const busy = submitting || navigating;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <IconCard icon={Mail} />
      <CodeInput
        key={codeKey}
        length={CODE_LENGTH}
        label="Código de recuperación de 4 dígitos"
        onChange={(value) => {
          setCode(value);
          if (error) setError(null);
        }}
        disabled={busy}
      />
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Check your email</h2>
        <p className="mt-1 text-sm text-white/80">Enviamos un código a {maskEmail(data.email)}</p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {info && !error && <Notice>{info}</Notice>}
      <div className="space-y-4">
        <Button type="submit" loading={busy}>
          Submit
        </Button>
        <Button variant="secondary" onClick={goBack} disabled={busy}>
          Back
        </Button>
      </div>
      <p className="text-center text-sm text-white">
        Didn&apos;t you receive any code?{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || resending}
          className="ml-1.5 rounded-sm font-bold hover:underline disabled:cursor-not-allowed disabled:font-semibold disabled:text-white/60 disabled:no-underline"
        >
          {resending ? "Sending…" : "Resend code"}
          {cooldown > 0 && <span className="tabular-nums"> ({cooldown}s)</span>}
        </button>
      </p>
    </form>
  );
}
