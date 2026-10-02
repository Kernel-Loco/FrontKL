"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Spinner } from "@/components/Spinner";
import { TextInput } from "@/components/TextInput";
import { useFlowState } from "@/hooks/useFlowState";
import { clearFlow } from "@/lib/flowStorage";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";
import { resetPassword } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

export function ResetPasswordForm() {
  const router = useRouter();
  const { ready, data } = useFlowState("reset");
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });
  const password = useWatch({ control, name: "password" }) ?? "";

  // Solo se llega aquí después de validar el código.
  useEffect(() => {
    if (ready && !data?.reset_token && !navigating) router.replace("/forgot-password");
  }, [ready, data, navigating, router]);

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    if (!data?.reset_token) return;
    setFormError(null);
    try {
      await resetPassword({ reset_token: data.reset_token, new_password: password });
      // Primero navigating: al limpiar el flujo, el efecto de arriba no debe redirigir.
      setNavigating(true);
      clearFlow("reset");
      router.replace("/login?notice=reset");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (!ready || !data?.reset_token) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Cargando">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-center text-sm text-white/90">Elige una contraseña nueva de al menos 12 caracteres.</p>
      <div>
        <TextInput
          label="New password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          autoFocus
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordStrength password={password} context={[data.email.split("@")[0] ?? ""]} />
      </div>
      <TextInput
        label="Confirm password"
        type="password"
        icon={Lock}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={isSubmitting || navigating} className="mt-2">
        Reset password
      </Button>
    </form>
  );
}
