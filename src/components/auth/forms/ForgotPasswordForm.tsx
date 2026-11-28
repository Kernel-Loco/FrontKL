"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Captcha } from "@/components/auth/Captcha";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { writeFlow } from "@/lib/flowStorage";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation";
import { requestPasswordReset } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import { tx } from "@/i18n/tx";

const CAPTCHA_MISSING = "Marca 'No soy un robot' y espera a que diga Verificado.";

/** Pide el enlace para elegir una contraseña nueva (RC-335). La API responde lo mismo exista o no la cuenta, y ese
 * texto se muestra tal cual en «Revisa tu correo». */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // Cuenta los intentos que llegaron a la API: cada uno gasta su captcha y el widget resuelve otro.
  const [attempts, setAttempts] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onCaptcha = (payload: string | null) => {
    setCaptcha(payload);
    if (payload) setFormError((current) => (current === tx(CAPTCHA_MISSING) ? null : current));
  };

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    if (!captcha) {
      setFormError(tx(CAPTCHA_MISSING));
      return;
    }
    try {
      const { detail } = await requestPasswordReset({ email, captcha });
      writeFlow("reset", { email, detail });
      setNavigating(true);
      router.push("/forgot-password/verify");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      // La API ya gastó este captcha: se resuelve otro para el siguiente intento.
      setCaptcha(null);
      setAttempts((n) => n + 1);
    }
  };

  const busy = isSubmitting || navigating;

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextInput label={tx("Correo")} placeholder="analista@organizacion.com" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Captcha renew={attempts} onChange={onCaptcha} />
      {formError && <Notice tone="error">{formError}</Notice>}
      <div className="space-y-4 pt-2">
        <Button type="submit" loading={busy}>
          {tx("Enviar enlace")}</Button>
        <Button variant="secondary" onClick={() => router.push("/login")} disabled={busy}>
          {tx("Volver")}</Button>
      </div>
    </form>
  );
}
