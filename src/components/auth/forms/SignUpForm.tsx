"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, User } from "lucide-react";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { PasswordStrength } from "@/components/PasswordStrength";
import { TextInput } from "@/components/TextInput";
import { signUpSchema, type SignUpValues } from "@/lib/validation";
import { register as registerUser } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const [password = "", username = "", email = ""] = useWatch({ control, name: ["password", "username", "email"] });

  const onSubmit = async ({ username, full_name, email, password }: SignUpValues) => {
    setFormError(null);
    try {
      await registerUser({ username, full_name, email, password });
      setNavigating(true);
      router.push("/login?notice=registered");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <TextInput label="Username" icon={User} autoComplete="username" error={errors.username?.message} {...register("username")} />
      <TextInput label="Name" icon={User} autoComplete="name" error={errors.full_name?.message} {...register("full_name")} />
      <TextInput label="E-mail" type="email" icon={Mail} autoComplete="email" error={errors.email?.message} {...register("email")} />
      <div>
        <TextInput
          label="Password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordStrength password={password} context={[username, email.split("@")[0] ?? ""]} />
      </div>
      <TextInput
        label="Confirm password"
        type="password"
        icon={Lock}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <p className="text-xs text-white/80">
        Tu cuenta se creará con rol <strong className="font-semibold text-white">Analista</strong>. Un Admin puede
        asignarte otro rol.
      </p>
      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={isSubmitting || navigating} className="mt-2">
        Sign Up
      </Button>
    </form>
  );
}
