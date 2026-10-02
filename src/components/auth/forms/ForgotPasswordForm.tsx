"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { writeFlow } from "@/lib/flowStorage";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation";
import { requestPasswordReset } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    try {
      await requestPasswordReset({ email });
      writeFlow("reset", { email });
      setNavigating(true);
      router.push("/forgot-password/verify");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const busy = isSubmitting || navigating;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-center text-sm text-white/90">
        Ingresa el e-mail de tu cuenta y te enviaremos un código de verificación.
      </p>
      <TextInput label="E-mail" type="email" icon={Mail} autoComplete="email" error={errors.email?.message} {...register("email")} />
      {formError && <Notice tone="error">{formError}</Notice>}
      <div className="space-y-4 pt-2">
        <Button type="submit" loading={busy}>
          Send code
        </Button>
        <Button variant="secondary" onClick={() => router.push("/login")} disabled={busy}>
          Back
        </Button>
      </div>
    </form>
  );
}
