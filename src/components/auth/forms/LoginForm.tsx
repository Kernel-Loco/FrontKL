"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, User } from "lucide-react";
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
      const { mfa_token } = await login(values);
      writeFlow("mfa", { mfa_token });
      setNavigating(true);
      router.push("/login/mfa");
    } catch (error) {
      resetField("password");
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextInput label="Username" icon={User} autoComplete="username" error={errors.username?.message} {...register("username")} />
      <TextInput
        label="Password"
        type="password"
        icon={Lock}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={isSubmitting || navigating} className="mt-2">
        Login
      </Button>
    </form>
  );
}
