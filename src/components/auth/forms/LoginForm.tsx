"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { writeFlow } from "@/lib/flowStorage";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { login } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const result = await login(values);
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
        labelAction={
          <Link href="/forgot-password" className="rounded-sm text-xs font-medium text-lt-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        }
        {...register("password")}
      />
      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={isSubmitting || navigating} className="!mt-6">
        Iniciar sesión
      </Button>
    </form>
  );
}
