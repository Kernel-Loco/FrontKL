"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import { ApiError } from "@/lib/apiClient";
import { writeFlow } from "@/lib/flowStorage";
import { enrollTokenFrom, MFA_ENROLL_PATH } from "@/lib/mfaEnroll";
import { ceremonyErrorMessage, isCeremonyAborted } from "@/lib/passkeys";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { login, passkeyLoginOptions, passkeyLoginVerify, requestLoginLink } from "@/services/authService";
import { getErrorMessage } from "@/services/errors";
import { tx } from "@/i18n/tx";

const CAPTCHA_MISSING = "Marca 'No soy un robot' y espera a que diga Verificado.";

const noSubscribe = () => () => {};

/** Mensaje de una entrada con passkey fallida: del navegador si vino de WebAuthn, de la API si no. El 403 de un
 * Admin sin TOTP (RC-5) trae su propio texto: entrar con contraseña para activarlo. */
function passkeyMessage(error: unknown) {
  return ceremonyErrorMessage(error) ?? getErrorMessage(error, { apiMessageOn403: true });
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // Cuenta los intentos que llegaron a la API: cada uno gasta su captcha y el widget resuelve otro.
  const [attempts, setAttempts] = useState(0);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  // Enlace al correo (#28, RC-63): el texto de la API, igual para todos, y si el pedido está en curso.
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  // Frena un segundo clic antes de que React pinte el botón como ocupado.
  const buttonActive = useRef(false);
  // En el servidor no hay WebAuthn: el botón aparece solo en un navegador que lo admite, sin romper la hidratación.
  const supportsPasskeys = useSyncExternalStore(noSubscribe, browserSupportsWebAuthn, () => false);
  const {
    register,
    handleSubmit,
    resetField,
    trigger,
    getValues,
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

  /** Pide el enlace con el correo del formulario y el mismo captcha. La respuesta es la misma exista o no la cuenta,
   * y dice que si no llega se entra con contraseña o passkey (decisión 7 de RC-327): se muestra tal cual. */
  const onLink = async () => {
    if (buttonActive.current) return;
    setFormError(null);
    setLinkNotice(null);
    if (!(await trigger("email"))) return;
    if (!captcha) {
      setFormError(tx(CAPTCHA_MISSING));
      return;
    }
    buttonActive.current = true;
    setLinkBusy(true);
    try {
      const { detail } = await requestLoginLink({ email: getValues("email"), captcha });
      setLinkNotice(detail);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      // La API ya gastó este captcha: se resuelve otro para el siguiente intento.
      setCaptcha(null);
      setAttempts((n) => n + 1);
      buttonActive.current = false;
      setLinkBusy(false);
    }
  };

  const onCaptcha = (payload: string | null) => {
    setCaptcha(payload);
    // El aviso de falta de captcha sobra en cuanto el widget dice Verificado. Los errores de la API se quedan.
    if (payload) setFormError((current) => (current === tx(CAPTCHA_MISSING) ? null : current));
  };

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    if (!captcha) {
      setFormError(tx(CAPTCHA_MISSING));
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
      // Admin sin TOTP (RC-5): 403 sin sesión con un token para activarlo en la pantalla del alta.
      const enrollToken = error instanceof ApiError ? enrollTokenFrom(error.status, error.detail) : null;
      if (enrollToken && error instanceof ApiError) {
        setNavigating(true);
        writeFlow("mfaEnroll", { mfa_setup_token: enrollToken, detail: error.message });
        router.push(MFA_ENROLL_PATH);
        return;
      }
      setFormError(getErrorMessage(error, { apiMessageOn403: true }));
      // La API ya gastó este captcha, haya fallado la contraseña o el propio captcha: se resuelve otro.
      setCaptcha(null);
      setAttempts((n) => n + 1);
    }
  };

  const busy = isSubmitting || navigating;

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <TextInput
        label={tx("Correo")}
        type="email"
        placeholder="nombre@organizacion.com"
        autoComplete="username"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextInput
        label={tx("Contraseña")}
        type="password"
        placeholder="••••••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        labelAction={
          <Link href="/forgot-password" className="rounded-sm text-xs font-medium text-lt-primary hover:underline">
            {tx("¿Olvidaste tu contraseña?")}</Link>
        }
        {...register("password")}
      />
      <Captcha renew={attempts} onChange={onCaptcha} />
      {formError && <Notice tone="error">{formError}</Notice>}
      {linkNotice && <Notice>{linkNotice}</Notice>}
      <Button type="submit" loading={busy && !passkeyBusy} disabled={passkeyBusy || linkBusy} className="!mt-6">
        {tx("Iniciar sesión")}</Button>
      {supportsPasskeys && (
        <Button variant="secondary" onClick={onPasskey} loading={passkeyBusy} disabled={busy || linkBusy}>
          {tx("Entrar con passkey")}</Button>
      )}
      {/* Junto a la contraseña, sin esconderla (decisión 7 de RC-327). */}
      <Button variant="secondary" onClick={onLink} loading={linkBusy} disabled={busy || passkeyBusy}>
        {tx("Entrar con un enlace al correo")}</Button>
    </form>
  );
}
