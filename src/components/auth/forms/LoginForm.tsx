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
import { loginSchema, type LoginValues } from "@/lib/validation";
import { login } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

const CAPTCHA_MISSING = "Marca 'No soy un robot' y espera a que diga Verificado.";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // Cuenta los intentos que llegaron a la API: cada uno gasta su captcha y el widget resuelve otro.
  const [attempts, setAttempts] = useState(0);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onCaptcha = (payload: string | null) => {
    setCaptcha(payload);
    // El aviso de falta de captcha sobra en cuanto el widget dice Verificado. Los errores de la API se quedan.
    if (payload) setFormError((current) => (current === CAPTCHA_MISSING ? null : current));
  };

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    if (!captcha) {
      setFormError(CAPTCHA_MISSING);
      return;
    }
    try {
      const result = await login({ ...values, captcha });
      setNavigating(true);
      if (result.mfa_required) {
        writeFlow("mfa", { mfa_token: result.mfa_token });
        router.push("/login/mfa");
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      resetField("password");
      setFormError(getErrorMessage(error));
      // La API ya gastó este captcha, haya fallado la contraseña o el propio captcha: se resuelve otro.
      setCaptcha(null);
      setAttempts((n) => n + 1);
    }
  };

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <TextInput
        label="Correo"
        type="email"
        placeholder="nombre@organizacion.com"
        autoComplete="username"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextInput
        label="Contraseña"
        type="password"
        placeholder="••••••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Captcha renew={attempts} onChange={onCaptcha} />
      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={isSubmitting || navigating} className="!mt-6">
        Iniciar sesión
      </Button>
    </form>
  );
}
