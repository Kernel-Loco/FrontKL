"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  WebAuthnAbortService,
} from "@simplewebauthn/browser";
import { Captcha } from "@/components/auth/Captcha";
import { Notice } from "@/components/auth/Notice";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { writeFlow } from "@/lib/flowStorage";
import { ceremonyErrorMessage, isCeremonyAborted } from "@/lib/passkeys";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { login, passkeyLoginOptions, passkeyLoginVerify } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";

const CAPTCHA_MISSING = "Marca 'No soy un robot' y espera a que diga Verificado.";

const noSubscribe = () => () => {};

/** Mensaje de una entrada con passkey fallida: del navegador si vino de WebAuthn, de la API si no. */
function passkeyMessage(error: unknown) {
  return ceremonyErrorMessage(error) ?? getErrorMessage(error);
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // Cuenta los intentos que llegaron a la API: cada uno gasta su captcha y el widget resuelve otro.
  const [attempts, setAttempts] = useState(0);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  // Frena un segundo clic antes de que React pinte el botón como ocupado.
  const buttonActive = useRef(false);
  // En el servidor no hay WebAuthn: el botón aparece solo en un navegador que lo admite, sin romper la hidratación.
  const supportsPasskeys = useSyncExternalStore(noSubscribe, browserSupportsWebAuthn, () => false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  /** Pide un reto de un solo uso, el navegador firma con la passkey y la API crea la sesión. */
  const enterWithPasskey = async () => {
    const { options, login_token } = await passkeyLoginOptions();
    const credential = await startAuthentication({ optionsJSON: options });
    await passkeyLoginVerify({ login_token, credential });
    setNavigating(true);
    router.replace("/dashboard");
    router.refresh();
  };

  // Sin autollenado de passkeys en el correo, para no encimarse con el menú del gestor de contraseñas (RC-331, 16 nov).
  // Al salir de la página se corta la ceremonia que el botón haya dejado abierta.
  useEffect(() => () => WebAuthnAbortService.cancelCeremony(), []);

  const onPasskey = async () => {
    if (buttonActive.current) return;
    buttonActive.current = true;
    setFormError(null);
    setPasskeyBusy(true);
    try {
      await enterWithPasskey();
    } catch (error) {
      if (!isCeremonyAborted(error)) setFormError(passkeyMessage(error));
    } finally {
      buttonActive.current = false;
      setPasskeyBusy(false);
    }
  };

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

  const busy = isSubmitting || navigating;

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
      <Button type="submit" loading={busy && !passkeyBusy} disabled={passkeyBusy} className="!mt-6">
        Iniciar sesión
      </Button>
      {supportsPasskeys && (
        <Button variant="secondary" onClick={onPasskey} loading={passkeyBusy} disabled={busy}>
          Entrar con passkey
        </Button>
      )}
    </form>
  );
}
