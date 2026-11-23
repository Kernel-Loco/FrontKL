"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Spinner } from "@/components/Spinner";
import { TextInput } from "@/components/TextInput";
import { tokenFromHash } from "@/lib/loginLink";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";
import { resetPassword } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

const NO_TOKEN = "El enlace no es válido o ya venció. Pide otro desde «¿Olvidaste tu contraseña?».";

const noSubscribe = () => () => {};
let captured: string | null | undefined;

/** El token del enlace (PORTAL_URL/forgot-password/reset#t=<token>, RC-335) va después de #, así que el navegador no
 * lo manda al servidor del portal ni en el Referer. Se lee una vez y se quita de la barra de direcciones y del
 * historial, para que no quede a la vista ni se comparta al copiar la URL. */
function readResetToken(): string | null {
  if (captured === undefined) {
    captured = tokenFromHash(window.location.hash);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }
  return captured;
}

/** El token sirve una sola vez, salga bien o mal: no se vuelve a usar ni al regresar a esta página. */
function forgetResetToken() {
  captured = null;
}

/** Elige la contraseña nueva con el token del enlace. Abrir la página no gasta el token: solo el envío del formulario,
 * así el revisor de enlaces del correo puede visitarla. La API gasta el token antes de revisar la contraseña, así que
 * cualquier rechazo pide otro enlace. */
export function ResetPasswordForm() {
  const router = useRouter();
  // undefined en el servidor (todavía no se sabe), null sin token válido.
  const linkToken = useSyncExternalStore(noSubscribe, readResetToken, () => undefined);
  const [spent, setSpent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const token = spent ? null : linkToken;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });
  const password = useWatch({ control, name: "password" }) ?? "";

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    if (!token) return;
    forgetResetToken();
    setFormError(null);
    try {
      const { passkeys_removed } = await resetPassword({ token, new_password: password });
      setNavigating(true);
      router.replace(passkeys_removed > 0 ? "/login?notice=reset_passkeys" : "/login?notice=reset");
    } catch (error) {
      setSpent(true);
      setFormError(getErrorMessage(error));
    }
  };

  // Tras guardar, el token ya no existe: el spinner evita mostrar «enlace no válido» mientras se va al login.
  if (linkToken === undefined || navigating) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Cargando">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Notice tone="error">{formError ?? NO_TOKEN}</Notice>
        <Link href="/forgot-password" className="block text-center text-sm font-semibold text-lt-primary hover:underline">
          Pedir otro enlace
        </Link>
        <Link href="/login" className="block text-center text-sm font-medium text-slate-500 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <TextInput
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          autoFocus
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordStrength password={password} />
      </div>
      <TextInput
        label="Confirma la contraseña"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {formError && <Notice tone="error">{formError}</Notice>}
      <Button type="submit" loading={isSubmitting || navigating} className="mt-2">
        Guardar contraseña
      </Button>
    </form>
  );
}
